let log = require("./log");
let wa = require("./wa_client");
let xmpp = require("./xmpp_component");
let data_bridge = require("./bridge");
let handlers = require("./stanza_handlers");

log.start();
log.enableDebug();
log.info("Starting whatsapp-xmpp bridge...");

process.on("SIGINT", function () {
    log.info("Received exit signal, shutting down...");
    xmpp_component.stop();
});

let bridge = new data_bridge.Bridge();
let xmpp_component = new xmpp.XMPP(bridge, "user@myxmpp.com");
let client = new wa.WAClient(bridge);
handlers.register(xmpp_component);
xmpp_component.start();
