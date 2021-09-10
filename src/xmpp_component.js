"use strict";
var log = require("./log");
const { component, xml } = require("@xmpp/component");
const { address_book } = require("./address_book");
var xmpp_util = require("./xmpp_util");
const debug = require("@xmpp/debug");
var fs = require("fs");

var config = null;
try {
    config = JSON.parse(fs.readFileSync("./xmpp_component.cfg"));
} catch (ex) {
    // Ignore
}

if (!config) {
    config = {
        service: "xmpp://localhost:8888",
        domain: "wa.bridge",
        password: "supersecretpassword",
        user: "someone",
    };
    fs.writeFileSync("./xmpp_component.cfg", JSON.stringify(config, null, 4));
}

const xmpp = component(config);

class XMPP {
    constructor(bridge) {
        this.xmpp = xmpp;
        this.bridge = bridge;
        this.address_book = new address_book(this);
        this.xmpp_user = config["user"];
        this.domain = config["domain"];
        this.stanza_handlers = [];
        bridge.xmpp = this;
        xmpp.on("error", (err) => this.on_error(err));
        xmpp.on("offline", () => this.on_offline());
        xmpp.on("stanza", (stanza) => this.on_stanza(stanza));
        xmpp.on("online", (address) => this.on_online(address));
    }

    send(xml) {
        this.xmpp.send(xml);
    }

    get_sender_from_contact(contact) {
        if (typeof contact.name == "string" && contact.name.length > 1)
            return contact.name;
        if (typeof contact.pushname == "string" && contact.name.length > 1)
            return "(" + contact.numer + ") " + contact.pushname;
        return contact.numer;
    }

    process_group_joined(data) {
        let id = this.make_address(data.id);
        xmpp.send(
            xml(
                "message",
                { type: "chat", from: this.make },
                xml(
                    "body",
                    {},
                    "New chat made by " +
                        data.owner +
                        ". Subject is '" +
                        data.subject
                )
            )
        );

        if (!this.chat_map[id]) this.chat_map[id] = data.id;
    }

    set_presence(jid, presence) {
        if (!presence || !presence.lastKnownPresence) {
            xmpp_util.send_presence(this, this.make_address(jid), "unavailable");
            return;
        }

        switch (presence.lastKnownPresence) {
            case "available": /* fallthrough */
            case "unavailable":
                xmpp_util.send_presence(this, this.address_book.get_xmpp_jid(jid), presence.lastKnownPresence);
                break;
            case "composing":
                xmpp_util.send_presence(this, this.address_book.get_xmpp_jid(jid), "available");
                break;
            case "recording":
                xmpp_util.send_presence(this, this.address_book.get_xmpp_jid(jid), "available", "Recording a voice message");
                break;
            case "paused":
                xmpp_util.send_presence(this, this.address_book.get_xmpp_jid(jid), "available");
                break;
        }
    }

    process_contacts(contacts) {
        this.address_book.sync_with_whatsapp(contacts);
    }

    process_chats(chats) {
        chats.array.forEach((chat) => {
            // TODO: All chats & messages could be imported here
        });
    }

    process_whats_app_message(msg) {}

    async stop() {
        let contacts = Object.keys(this.address_book.contacts);
        // Notify xmpp that all contacts are now offline as the bridge is shutting down
        let promises = [];
        contacts.forEach((contact) => {
            let presence = xml("presence", {
                from: contact,
                to: this.xmpp_user,
                type: "unavailable",
            });
            promises.push(xmpp.send(presence));
        });
        Promise.all(promises).then(() => {
            xmpp.stop();
            process.exit();
        });
    }

    start() {
        xmpp.start().catch(log.error);
    }

    on_error(err) {
        log.error(err);
    }

    on_offline() {
        log.info("XMPP component is offline");
    }

    on_online(address) {
        log.info("XMPP Component is online under " + address);
    }

    on_stanza(stanza) {
        log.debug(stanza);
        // <iq from="" type="get" id="b32dfe61-cc3d-43be-9ebc-1906bc9d4b94" to=".at.s.whatsapp.net@wa.bridge"><vCard xmlns="vcard-temp"/></iq>

        this.stanza_handlers.forEach((h) => h(stanza, this));

        /*if (
            stanza.is("message") &&
            stanza.children.length > 0 &&
            stanza.children[0].name == "body"
        ) {
            let id = stanza.attrs["to"];
            this.bridge.forward_to_whats_app({
                data: stanza,
                chat_id: this.chat_map[id],
            });
        }*/
    }
}

module.exports = { XMPP };
