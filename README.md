This isn't actively developed, use [slidge](https://slidge.im/core/) or [mautrix](https://docs.mau.fi/bridges/) instead.

# whatsxmpp
A small tool to bridge messages between WhatsApp and an [XMPP](https://xmpp.org/) server.
Data is bridged via a XMPP Component and a WhatsApp Web session managed by whatsapp-web.js.
The WhatsApp Web session runs headless and therfore can be hosted on a server, but the
initial login has to be done over the qr code which seems to cause issues because the app
expects a white background with a black qr code, but terminals are usually the opposite.

This component is intended to be run alongside your own xmpp server and will only bridge
between one xmpp user and one WhatsApp account.

What works
- Forwarding contacts via [XEP-0144](https://xmpp.org/extensions/xep-0144.html)

Todo:
- Reimplement message bridging
- Create proper group chats
- Image/File/Audio transfer
- Properly report status in XMPP

Uses
- [xmpp.js](https://github.com/xmppjs/xmpp.js/)
- [Baileys](https://github.com/adiwajshing/Baileys)
- [node-qrcode](https://github.com/soldair/node-qrcode)
