'use strict';
var log = require('./log');
const { component, xml } = require('@xmpp/component');
const debug = require('@xmpp/debug');
var fs = require('fs');

const xmpp = component({
    service: 'xmpp://localhost:8888',
    domain: 'wa.bridge',
    password: 'supersecretpassword',
});

class XMPP {
    constructor(bridge, xmpp_user) {
        this.xmpp = xmpp;
        this.bridge = bridge;
        bridge.xmpp = this;
        this.xmpp_user = xmpp_user;
        xmpp.on('error', (err) => this.on_error(err));
        xmpp.on('offline', () => this.on_offline());
        xmpp.on('stanza', (stanza) => this.on_stanza(stanza));
        xmpp.on('online', (address) => this.on_online(address));
        this.chat_map = {};
        fs.open('./chat_map.json', 'r', (err, fd) => {
            if (!err) {
                let content = fs.readFileSync(fd);
                try {
                    this.chat_map = JSON.parse(content);    
                } catch (error) {
                    log.error('Failed to parse chat map json: ' + error);
                }
            }
        });
    }

    // Make sure it's a valid alpha numerical name
    format_chat_name(name) {
        return name.replace(/[^a-z0-9]/gi,'') + '@wa.bridge';
    }

    get_sender_from_contact(contact) {
        if (typeof(contact.name) == 'string' && contact.name.length > 1)
            return contact.name;
        if (typeof(contact.pushname) == 'string' && contact.name.length > 1)
            return '(' + contact.numer + ') ' + contact.pushname;
        return contact.numer;
    }

    send_as_transfer(text) {
        const message = xml(
            "message",
            { type: "chat", to: this.xmpp_user },
            xml("body", {}, text),
          );
        xmpp.send(message);
    }

    process_whats_app_message(msg) {
        msg.getContact().then(contact => {
            msg.getChat().then(chat => {
                // The messages are proxied via their internal whatsapp id, so we can map
                // an xmpp chat to a whatsapp chat, this makes it hard to identify a chat for
                // users though, so if this is the first time we encounter this chat we send
                // an additional info message to allow users to save this chat with user friendly
                // aliases
                let msg_prefix = '';
                let from = this.get_sender_from_contact(contact);
                let id = chat.id._serialized.replace('@', '.at.') + '@wa.bridge';
                if (!this.chat_map[id]) {
                    msg_prefix = 'This is the first message bridged for this contact/chat, here\'s some info:\n';
                    if (chat.isGroup)
                        msg_prefix += 'The chat is known as ' + chat.name + '\n';
                    else
                        msg_prefix += 'The user is known as ' + from + '\n';
                }
                this.chat_map[id] = chat.id._serialized;
                let message = null;
                if (chat.isGroup) {
                    // Group messages should ideally use xmpp conference chats, but for now we just proxy
                    // them to one single chat since that's easier for now
                    message = xml(
                        'message',
                        { type: 'chat', from: id, to: this.xmpp_user },
                        xml('body', {}, msg_prefix + from + ': ' + msg.body)
                    );
                } else {                     
                    message = xml(
                        'message',
                        { type: 'chat', from: id, to: this.xmpp_user },
                        xml('body', {}, msg_prefix + msg.body)
                    );    
                }
                // Confirm that we've seen the message after it was forwarded via xmpp
                xmpp.send(message).then(() => chat.sendSeen());
            })
        })
    }

    stop() {
        fs.writeFileSync('./chat_map.json', JSON.stringify(this.chat_map));
        xmpp.stop();
        process.exit();
    }

    start() {
        xmpp.start().catch(log.error);
    }

    on_error(err) {
        log.error(err);
    }

    on_offline() {
        log.info('XMPP component is offline');
    }

    on_online(address) {
        log.info('XMPP Component is online under ' + address);
    }

    on_stanza(stanza) {
        log.debug(stanza);
        if (stanza.is('message') && stanza.children.length > 0 && stanza.children[0].name == 'body') {
            let id = stanza.attrs['to'];
            this.bridge.forward_to_whats_app({ data: stanza, chat_id: this.chat_map[id]});
        }
    }
}

module.exports = { XMPP };
