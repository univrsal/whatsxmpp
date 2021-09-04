class Bridge {
    constructor() {
        this.xmpp = null;
        this.whatsapp = null;
    }

    forward_to_xmpp(whats_app_message) {
        if (this.xmpp) {
            this.xmpp.process_whats_app_message(whats_app_message);
        }
    }

    forward_to_whats_app(xmpp_message) {
        if (this.whatsapp) this.whatsapp.process_xmpp_message(xmpp_message);
    }

    get_xmpp() {
        return this.xmpp;
    }

    get_whatsapp() {
        return this.whatsapp;
    }
}
module.exports = { Bridge };
