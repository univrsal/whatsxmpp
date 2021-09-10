const { xml } = require("@xmpp/component");
var xmpp_util = require("./xmpp_util");

function on_presence_subscribe(stanza, xmpp) {
    if (stanza.attrs["type"] === "subscribe") {
        // We set each contact to offline initially, we'll send another presence if this changes
        // "to" is the bridged whatsapp user that the xmpp user subscribed to
        xmpp_util.send_presence(xmpp, stanza.attrs["to"], "unavailable");
    }
}

function on_disco1(stanza, xmpp) {
    // Always make sure that we only send information to the main xmpp user
    // others shouldn't be allowed to query this
    if (stanza.attrs.id === "disco1" && stanza.attrs.from === xmpp.xmpp_user) {
        /*
<iq from='juliet@capulet.com/balcony'
    id='disco1'
    to='romeo@shakespeare.lit/orchard'
    type='result'>
  <query xmlns='http://jabber.org/protocol/disco#info'>
    <feature var='http://jabber.org/protocol/chatstates'/>
  </query>
</iq>
*/
        const message = xml(
            "iq",
            {
                from: stanza.attrs["to"],
                to: stanza.attrs["from"],
                type: "result",
            },
            xml(
                "query",
                "'http://jabber.org/protocol/disco#info",
                xml("feature", { var: "http://jabber.org/protocol/chatstates" })
            )
        );
    }
}

function on_get_vcard(stanza, xmpp) {
    /*
    iq from="uni@vrsal.de/lrSRRrJa" type="get" id="4259ad4c-44b7-4628-8a0d-f907963c1d05" to="4917682516358.at.s.whatsapp.net@wa.bridge"><vCard xmlns="vcard-temp"/></iq>
    */
    if (stanza.attrs["type"] === "get") {
        if (
            stanza.children &&
            stanza.children.length > 0 &&
            stanza.children[0].attrs["xmlns"] === "vcard-temp"
        ) {
            let contact = xmpp.address_book.contacts[stanza.attrs["to"]];
            if (!contact) {
                log.error("Invalid conctact when retrieving vcard");
                return;
            }

            xmpp.bridge
                .get_whatsapp()
                .get_profile_picture(contact.jid)
                .then((url) => {
                    xmpp.address_book.contacts[stanza.attrs["to"]].avatar_url =
                        url;
                    xmpp_util.send_vcard(xmpp, contact, stanza.attrs["id"]);
            });
        }
    }
}

function on_info2(stanza, xmpp) {
    // Always make sure that we only send information to the main xmpp user
    // others shouldn't be allowed to query this

    /*
<iq from='juliet@capulet.com/balcony'
    id='disco1'
    to='romeo@shakespeare.lit/orchard'
    type='result'>
  <query xmlns='http://jabber.org/protocol/disco#info'>
    <feature var='http://jabber.org/protocol/chatstates'/>
  </query>
</iq>
*/
    if (stanza.attrs.id === "info2" && stanza.attrs.from === xmpp.xmpp_user) {
        const message = xml(
            "iq",
            {
                type: "result",
                from: stanza.attrs["to"],
                to: stanza.attrs["from"],
                id: "info2",
            },
            xml(
                "query",
                "http://jabber.org/protocol/disco#info",
                xml("identity", { category: "account", type: "registered" }),
                xml("feature", { var: "http://jabber.org/protocol/disco#info" })
            )
        );
        xmpp.send(message);
    }
}

function register(xmpp) {
    xmpp.stanza_handlers.push(on_presence_subscribe);
    xmpp.stanza_handlers.push(on_disco1);
    xmpp.stanza_handlers.push(on_info2);
    xmpp.stanza_handlers.push(on_get_vcard);
}

module.exports = { register };
