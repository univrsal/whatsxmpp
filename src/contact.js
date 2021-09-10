const { xml } = require("@xmpp/component");

var log = require("./log");

class contact {
    constructor(whats_app_contact) {
        this.jid = whats_app_contact.jid;
        this.name = whats_app_contact.notify;
        this.avatar_url = whats_app_contact.imgUrl;
        if (whats_app_contact.name) this.name = whats_app_contact.name;
    }

    publish_avatar(address_book) {
        if (this.avatar_url === undefined)
            return;
        https.get(this.avatar_url, (resp) => {
            resp.setEncoding('base64');
            let body = "";
            resp.on('data', (data) => { body += data});
            resp.on('end', () => {
                const hash = crypto.createHash("sha1");
                hash.update(body);
                let message = xml("iq", { type: "set", from: address_book.make_address(this.jid), to: address_book.xmpp.xmpp_user, id: "publish1" },
                    xml("pubsub", "http://jabber.org/protocol/pubsub", 
                        xml("publish", { node: "urn:xmpp:avatar:data" }),
                        xml("item", { id: hash.digest("hex") },
                            xml("data", "urn:xmpp:avatar:data", body)
                        )
                    )
                );
                /*
<iq type='set' id='setfull'>
  <profile xmlns='urn:xmpp:tmp:profile'>
    <x xmlns='jabber:x:data' type='submit'>
      <field var='FORM_TYPE' type='hidden'>
        <value>urn:xmpp:tmp:profile</value>
      </field>
      <field var='nickname'>
        <value>Hamlet</value>
      </field>
      <field var='country'>
        <value>DK</value>
      </field>
      <field var='locality'>
        <value>Elsinore</value>
      </field>
      <field var='email'>
        <value>hamlet@denmark.lit</value>
      </field>
    </x>
  </profile>
</iq>
                */
                message = xml(
                    "message", {type: "set", id: "setfull", from: address_book.make_address(this.jid), to: address_book.xmpp.xmpp_user },
                    xml(
                        "profile", "urn:xmpp:tmp:profile",
                        xml(
                            "x", { xmlns: "jabber:x:data", type: "submit" },
                            xml(
                                "field", { var: "FORM_TYPE", type: "hidden" },
                                xml("value", null, "urn:xmpp:tmp:profile")
                            ),
                            xml(
                                "field", { var: "nickname" },
                                xml("value", null, "Le ebin nickname")
                            )
                        )
                    )
                )
                //log.debug(message.toString());
                address_book.xmpp.send(message);
            });
        }).on('error', (e) => {
            log.error(`Got while retrieving WhatsApp avatar: ${e.message}`);
        });
    }
}

module.exports = { contact };
