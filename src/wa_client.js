var WA = require("@adiwajshing/baileys");
var log = require("./log");
var QRCode = require("qrcode");
var fs = require("fs");

class WAClient {
    constructor(bridge) {
        this.bridge = bridge;
        this.connected = false;
        bridge.whatsapp = this;
        this.connection = new WA.WAConnection();
        let credentials = null;
        try {
            credentials = fs.readFileSync("./auth_info.json");
        } catch (error) {}

        if (credentials) this.connection.loadAuthInfo(JSON.parse(credentials));

        this.connection.on("open", () => {
            fs.writeFileSync(
                "./auth_info.json",
                JSON.stringify(
                    this.connection.base64EncodedAuthInfo(),
                    null,
                    "\t"
                )
            );
        });
        this.connection.on("connecting", () =>
            log.info("Connecting to WhatsApp")
        );
        this.connection.on("close", (data) =>
            this.on_disconnect(data, "WhatsApp")
        );
        this.connection.on("ws-close", (data) =>
            this.on_disconnect(data, "WebSocket")
        );
        this.connection.on("qr", (qr) => this.on_qr_code);
        this.connection.on("connection-phone-change", (state) =>
            this.on_phone_conection_changed(state)
        );
        this.connection.on("chat-new", (chat) => this.on_new_chat(chat));
        this.connection.on("contact-update", (update) =>
            this.on_contact_update(update)
        );
        this.connection.on("chat-update", (update) =>
            this.on_chat_update(update)
        );
        this.connection.on("chats-update", (updates) => {
            updates.forEach(update => this.on_chat_update(update));
        })
        this.connection.on("chats-received", (new_chats) =>
            this.on_chats_received(new_chats)
        );
        this.connection.on("contacts-received", (contacts) =>
            this.on_contacts_received(contacts)
        );
        this.connection.connect();
    }

    get_profile_picture(jid) {
        return this.connection.getProfilePicture(jid);
    }

    on_contacts_received(contacts) {
        this.bridge.get_xmpp().process_contacts(this.connection.contacts);
    }

    on_chats_received(new_chats) {
        this.bridge.get_xmpp().process_chats(this.connection.chats);
    }

    on_chat_update(update) {
        if (update.presences) {
            log.debug(update.presences);
            let keys = Object.keys(update.presences);
            keys.forEach(jid => {
                this.bridge.get_xmpp().set_presence(jid, update.presences[jid]);
            });
        }
        log.debug(update);
    }

    on_contact_update(update) {
        // TODO
        log.debug(update);
    }

    on_phone_conection_changed(state) {
        this.connected = state;
        if (!this.connected) this.handle_disconnect();
        else log.info("Connected to WhatsApp");
    }

    handle_disconnect() {
        this.connected = false;
        // We want to tell xmpp if we lost the connection for good
        setTimeout(() => {
            if (this.connected === false)
                this.bridge
                    .get_xmpp()
                    .send_as_transfer(
                        "Bridge lost connection to phone/whatsapp"
                    );
        }, 5000);
    }

    on_new_chat(chat) {
        if (chat.metadata) {
            // TODO: description, participants etc.
            let joined_data = {
                id: chat.metadata.id,
                owner: chat.metadata.owner,
                subject: chat.metadata.subject,
            };
            this.bridge.get_xmpp().process_group_joined(joined_data);
        }
    }

    on_disconnect(data, what) {
        log.info(
            `Conection to ${what} closed: ` +
                data.DisconnecReason +
                ", reconnecting: " +
                toString(data.isReconnecting)
        );
        this.handle_disconnect();
    }

    on_message(message) {
        this.bridge.forward_to_xmpp(message);
    }

    on_qr_code(qr) {
        log.debug("Received QRCode: " + qr);
        QRCode.toString(qr, (err, str) => this.on_qr_code_encoded(err, str));
    }

    on_qr_code_encoded(err, str) {
        if (err) {
            log.error("Error while generating QR Code: " + err);
        } else {
            this.qr_code = str;
            log.info("===========================================");
            log.info("WhatsApp Web QR Code:");
            log.info(str);
            log.info("===========================================");
        }
    }

    process_xmpp_message(message) {
        this.client.getChatById(message.chat_id).then((chat) => {
            this.client.sendMessage(
                message.chat_id,
                message.data.children[0].children[0]
            );
        });
    }
}

module.exports = { WAClient };
