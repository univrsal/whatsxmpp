# whatsxmpp
A small tool to bridge messages between WhatsApp and an [XMPP](https://xmpp.org/) server.
Data is bridged via a XMPP Component and a WhatsApp Web session managed by whatsapp-web.js.
The WhatsApp Web session runs headless and therfore can be hosted on a server, but the
initial login has to be done over the qr code which seems to cause issues because the app
expects a white background with a black qr code, but terminals are usually the opposite.

What works
- Receiving messages from a WhatsApp user
- Receiving messages from a WhatsApp group (All messages in that group chat will be bridged to one contact currently)

Todo:
- Forward contacts via [XEP-0144](https://xmpp.org/extensions/xep-0144.html)
- Create proper group chats
- Image/File/Audio transfer
- Properly report status in XMPP

Uses
- [xmpp.js](https://github.com/xmppjs/xmpp.js/)
- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)
- [node-qrcode](https://github.com/soldair/node-qrcode)
