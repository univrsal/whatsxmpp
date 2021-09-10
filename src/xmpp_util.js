const { xml } = require("@xmpp/component");
var https = require("https");
var log = require("./log");
const crypto = require("crypto");

function send_as_transfer(xmpp, text) {
    const message = xml(
        "message",
        { type: "chat", to: xmpp.xmpp_user },
        xml("body", {}, text)
    );
    xmpp.send(message);
}

function send_presence(xmpp, user, status, additional = null) {
    let message = null;
    if (status === "available") {
        message = xml(
            "presence",
            { from: user, to: xmpp.xmpp_user },
            additional
        );
    } else {
        message = xml(
            "presence",
            { from: user, to: xmpp.xmpp_user, type: status },
            additional
        );
    }

    log.debug("presence: " + message.toString());
    xmpp.send(message);
}

/*
    active, composing, paused, inactive, gone
 */
function send_chat_state(xmpp, user, status) {
    /*
<message
    from='bernardo@shakespeare.lit/pda'
    to='francisco@shakespeare.lit/elsinore'
    type='chat'>
  <composing xmlns='http://jabber.org/protocol/chatstates'/>
</message>
*/
    const message = xml(
        "message",
        { from: user, to: xmpp_user, type: "chat" },
        xml(status, "http://jabber.org/protocol/chatstates")
    );
    xmpp.send(message);
}

function send_vcard(xmpp, contact, id=null) {
    https.get(contact.avatar_url, (resp) => {
        resp.setEncoding("base64");
        let body = "";
        resp.on("data", (data) => {
            body += data;
        });
        resp.on("end", () => {
            const message = xml(
                "iq",
                {
                    from: xmpp.address_book.get_xmpp_jid(contact.jid),
                    to: xmpp.xmpp_user,
                    type: "set",
                    id: id != null ? id : "vc1",
                },
                xml("vCard", "vcard-temp",
                    xml("N", null, contact.name),
                    xml("TEL", { type: "HOME" }, contact.jid), // TODO: Format
                    xml("PHOTO", null, 
                        xml("TYPE", null, "image/jpeg"),
                        xml("BINVAL", null, body)
                    )
                )
            );
            log.debug(message.toString());
            xmpp.send(message);
        });
    });
}

function send_avatar_pubsub(xmpp, user, url) {
    https.get(url, (resp) => {
        resp.setEncoding("base64");
        let body = "";
        resp.on("data", (data) => {
            body += data;
        });
        resp.on("end", () => {
            const hash = crypto.createHash("sha1");
            hash.update(body);

            const message = xml(
                "iq",
                { type: "set", from: user, id: "publish" },
                xml(
                    "pubsub",
                    "",
                    xml(
                        "publish",
                        { node: "" },
                        xml(
                            "item",
                            { id: hash.digest("hex") },
                            xml("data", "", body)
                        )
                    )
                )
            );
            log.debug("msg: " + message.toString());
            xmpp.send(message);
        });
    });
}

module.exports = {
    send_presence,
    send_avatar_pubsub,
    send_chat_state,
    send_as_transfer,
    send_vcard
};
