var fs = require("fs");
const { xml } = require("@xmpp/component");
var log = require("./log");
const { contact } = require("./contact");

class address_book {
    constructor(xmpp) {
        this.xmpp = xmpp;
        this.contacts = {};
        fs.open("./address_book.json", "r", (err, fd) => {
            if (!err) {
                let content = fs.readFileSync(fd);
                try {
                    this.contacts = JSON.parse(content);
                } catch (error) {
                    log.error("Failed to address book map json: " + error);
                }
            }
        });
    }

    get_xmpp_jid(whats_app_address) {
        return whats_app_address.replace("@", ".at.") + "@" + this.xmpp.domain;
    }

    get_whatsapp_jid(xmpp_id) {
        return xmpp_id.replace("@" + this.domain, "").replace(".at.", "@");
    }

    sync_with_whatsapp(wa_contacts) {
        let xml_contacts = [];
        let keys = Object.keys(wa_contacts);
        for (let i = 0; i < keys.length; i++) {
            let entry = wa_contacts[keys[i]];
            if (entry.jid.indexOf("g.us") !== -1) continue; // no groups
            if (entry.jid === "status@broadcast") continue; // idk what this is for
            if (entry.notify.indexOf("Karsten") !== -1) continue; // I have no idea who this is, but they keep showing up even though I do not have them a as a contact so we just skip them for now
            let contact_address = this.get_xmpp_jid(entry.jid);
            if (this.contacts[contact_address]) {
                log.debug(
                    "Skipping " + entry.notify + " they've already been added"
                );
                continue;
            }
            let c = new contact(entry);
            this.contacts[contact_address] = c;
            xml_contacts.push({
                action: "add",
                jid: contact_address,
                name: c.name,
            });

            // Get Profile picture
            // this.xmpp.bridge.get_whatsapp().get_profile_picture(c.jid).then(url => {
            //     c.avatar_url = url;
            //     c.publish_avatar(this);
            // });
        }

        if (xml_contacts.length === 0) return;

        let roster_item_exchange = xml(
            "message",
            { from: "bridge@" + this.xmpp.domain, to: this.xmpp.xmpp_user },
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
        this.save();
    }

    save() {
        //fs.writeFileSync("./address_book.json", JSON.stringify(this.contacts));
    }
}

module.exports = { address_book };
