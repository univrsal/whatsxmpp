const { Client } = require('whatsapp-web.js');
var log = require('./log');
var QRCode = require('qrcode');
var fs = require('fs');

class WAClient {
    constructor(bridge) {
        this.session_cfg = null;
        this.bridge = bridge;
        bridge.whatsapp = this;
        fs.open('./whats_app_client_session.json', 'r', (err, fd) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    log.info(
                        'WhatsApp session doesn\'t exist, creating new one.'
                    );
                } else {
                    log.error('Error while reading WhatsApp session: ' + err);
                }
            } else {
                try {
                    this.session_cfg = JSON.parse(fs.readFileSync(fd));
                } finally {
                    fs.close(fd, (err) => {
                        if (err) throw err;
                    });
                }
            }
            this.client = new Client({
                puppeteer: { headless: true },
                session: this.session_cfg,
            });
            this.client.initialize();
            this.qr_code = undefined;
            this.client.on('qr', (qr) => this.on_qr_code(qr));
            this.client.on('auth_failure', (msg) =>
                this.on_authenitcation_failed(msg)
            );
            this.client.on('authenticated', (session) =>
                this.on_authenticated(session)
            );
            this.client.on('ready', () => this.onReady());
            this.client.on('message', (message) => this.on_message(message));
        });
    }

    on_message(message) {
        this.bridge.forward_to_xmpp(message);
    }

    on_qr_code(qr) {
        log.debug('Received QRCode: ' + qr);
        QRCode.toString(qr, (err, str) =>
            this.on_qr_code_encoded(err, str)
        );
    }

    on_qr_code_encoded(err, str) {
        if (err) {
            log.error('Error while generating QR Code: ' + err);
        } else {
            this.qr_code = str;
            log.info('===========================================');
            log.info('WhatsApp Web QR Code:');
            log.info(str);
            log.info('===========================================');
        }
    }

    on_authenticated(session) {
        log.info('Client authenticated');
        this.session_cfg = session;
        fs.open('./whats_app_client_session.json', 'w', (err, fd) => {
            if (err) {
                log.error('Error while saving WhatsApp session: ' + err);
                return;
            }
            fs.writeSync(fd, JSON.stringify(this.session_cfg));
        });
    }

    on_authenitcation_failed(msg) {
        log.err('Client authentication failed: ' + msg);
    }

    onReady() {
        log.info('Client ready');
    }

    process_xmpp_message(message) {
        this.client.getChatById(message.chat_id).then(chat => {
            this.client.sendMessage(message.chat_id, message.data.children[0].children[0]);
        });
        
    }
}

module.exports = { WAClient };
