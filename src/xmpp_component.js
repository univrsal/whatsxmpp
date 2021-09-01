'use strict';
var log = require('./log');
const { component, xml } = require('@xmpp/component');
const debug = require('@xmpp/debug');

const xmpp = component({
    service: 'xmpp://localhost:8888',
    domain: 'wa.bridge',
    password: 'ayyyfml123',
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

    process_whats_app_message(msg) {
        msg.getContact().then(contact => {
            msg.getChat().then(chat => {
                if (chat.isGroup) {
                    // Group messages should ideally use xmpp conference chats, but for now we just proxy
                    // them to one single chat since that's easier for now
                    const message = xml(
                        'message',
                        { type: 'chat', from: this.format_chat_name(chat.name), to: this.xmpp_user },
                        xml('body', {}, this.get_sender_from_contact(contact) + ': ' + msg.body)
                    );
                    xmpp.send(message);
                } else {                     
                    // Messages are proxied via the contact number, so currently the 
                    // user is expected to save the number as a contact manually, but there
                    // seems to be a way to forward the contact info via roster item exchange
                    // no idea how though
                    // https://xmpp.org/extensions/xep-0144.html
                    const message = xml(
                        'message',
                        { type: 'chat', from: contact.number + '@wa.bridge', to: this.xmpp_user },
                        xml('body', {}, msg.body)
                    );
                    // Confirm that we've seen the message after it was forwarded via xmpp
                    xmpp.send(message).then(() => chat.sendSeen());
                }
            })
        })
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
        if (stanza.is('message')) {
            if (stanza.children[0].name == 'body') {
                let message_elements = stanza.children[0].children;
            }
        }
    }
}

module.exports = { XMPP };
