let log = require('./log');
let wa = require('./wa_client')
let xmpp = require('./xmpp_component')
let data_bridge = require('./bridge')


log.start();
log.enableDebug();
log.info('Starting whatsapp-xmpp bridge...');


process.on('SIGINT', function() {
    log.info("Received exit signal, shutting down...");
    process.exit();
});
let bridge = new data_bridge.Bridge();
let xmpp_component = new xmpp.XMPP(bridge, 'uni@vrsal.de');
let client = new wa.WAClient(bridge);
xmpp_component.start();