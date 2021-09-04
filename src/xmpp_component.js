"use strict";
var log = require("./log");
const { component, xml } = require("@xmpp/component");
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
        bridge.xmpp = this;
        this.xmpp_user = config["user"];
        this.domain = config["domain"];
        xmpp.on("error", (err) => this.on_error(err));
        xmpp.on("offline", () => this.on_offline());
        xmpp.on("stanza", (stanza) => this.on_stanza(stanza));
        xmpp.on("online", (address) => this.on_online(address));
        this.chat_map = {};
        fs.open("./chat_map.json", "r", (err, fd) => {
            if (!err) {
                let content = fs.readFileSync(fd);
                try {
                    this.chat_map = JSON.parse(content);
                } catch (error) {
                    log.error("Failed to parse chat map json: " + error);
                }
            }
        });
    }

    // Make sure it's a valid alpha numerical name
    format_chat_name(name) {
        return name.replace(/[^a-z0-9]/gi, "") + "@" + this.domain;
    }

    get_sender_from_contact(contact) {
        if (typeof contact.name == "string" && contact.name.length > 1)
            return contact.name;
        if (typeof contact.pushname == "string" && contact.name.length > 1)
            return "(" + contact.numer + ") " + contact.pushname;
        return contact.numer;
    }

    send_as_transfer(text) {
        const message = xml(
            "message",
            { type: "chat", to: this.xmpp_user },
            xml("body", {}, text)
        );
        xmpp.send(message);
    }

    make_address(whats_app_address) {
        return whats_app_address.replace("@", ".at.") + "@" + this.domain;
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

    process_contacts(contacts) {
        let xml_contacts = [];
        let keys = Object.keys(contacts);
        for (let i = 0; i < keys.length; i++) {
            let contact = contacts[keys[i]];
            if (contact.jid.indexOf("g.us") !== -1) continue; // no groups
            if (contact.jid === "status@broadcast") continue; // idk what this is for

            let contact_address = this.make_address(contact.jid);
            if (this.chat_map[contact_address]) {
                log.debug(
                    "Skipping " + contact.notify + " they've already been added"
                );
                continue;
            }
            this.chat_map[contact_address] = contact.jid;

            let id = contact.notify; // Public nickname for the user;
            if (contact.name)
                // Saved contact name, preferred but not always available
                id = contact.name;

            xml_contacts.push({
                action: "add",
                jid: contact_address,
                name: id,
            });
            console.log(contact);
        }

        if (xml_contacts.length === 0) return;

        let roster_item_exchange = xml(
            "message",
            { from: "bridge@" + this.domain, to: this.xmpp_user },
            xml(
                "body",
                null,
                "These are contacts imported from you WhatsApp account"
            ),
            xml(
                "x",
                "http://jabber.org/protocol/rosterx",
                xml_contacts.map((c, idx) =>
                    xml("item", c, xml("group", null, "WhatsApp Contacts"))
                )
            )
        );
        this.xmpp.send(roster_item_exchange);
        this.save_chat_map();
    }

    process_chats(chats) {
        chats.array.forEach((chat) => {
            // TODO
        });
    }

    process_whats_app_message(msg) {}

    save_chat_map() {
        fs.writeFileSync("./chat_map.json", JSON.stringify(this.chat_map));
    }

    stop() {
        this.save_chat_map();
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
        log.info("XMPP component is offline");
    }

    on_online(address) {
        log.info("XMPP Component is online under " + address);
    }

    on_stanza(stanza) {
        log.debug(stanza);
        if (
            stanza.is("message") &&
            stanza.children.length > 0 &&
            stanza.children[0].name == "body"
        ) {
            let id = stanza.attrs["to"];
            this.bridge.forward_to_whats_app({
                data: stanza,
                chat_id: this.chat_map[id],
            });
        }
    }
}

module.exports = { XMPP };
