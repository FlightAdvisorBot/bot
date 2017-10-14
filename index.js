//loading modules
const express = require("express");
const builder = require("botbuilder");
const request = require("request-promise");
// const locationDialog = require('botbuilder-location');
const appUrl = process.env.APP_URL;
const apiUrl = "";

//create an express server
var app = express();
app.use(express.static('public'));
var port = process.env.port || process.env.PORT || 3978;
app.listen(port, function () {
    console.log('%s listening in port %s', app.name, port);
});


//create a chat connector for the bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

//load the botbuilder classes and build a unversal bot using the chat connector
var bot = new builder.UniversalBot(connector, {
	localizerSettings: {
		defaultLocale: "en"
	}
});

//hook up bot endpoint
app.post("/api/messages", connector.listen());



bot.dialog("/", [
	(session, results, next) => {

		let test = session.gettext("what-do-you-want-to-do");
		let msg = new builder.Message(session)
			.text(test)
			.attachments([new builder.Keyboard(session)
				.buttons([
					builder.CardAction.imBack(session, session.gettext("manage-saving-fund"), "manage-saving-fund"),
					builder.CardAction.imBack(session, session.gettext("flight-planning"), "flight-planning")
				])
			]);

		builder.Prompts.text(session, msg);
	},
	(session, results, next) => {

		let message = session.message.text.toLowerCase();
		if(message.includes("fund")) {
			session.beginDialog("saving-fund");
		} else if(message.includes("flight")) {
			session.beginDialog("flight-planning");
		}

	}
])

bot.dialog("saving-fund", [
	(session, results, next) => {
		
		let title = session.gettext("choose-an-option");
		let msg = new builder.Message(session)
			.text(title)
			.attachments([new builder.Keyboard(session)
				.buttons([
					builder.CardAction.imBack(session, session.gettext("program-saving"), "program-saving"),
					builder.CardAction.imBack(session, session.gettext("transfer-money"), "transfer-money")
				])
			]);

		builder.Prompts.text(session, msg);
	},
	(session, results, next) => {
		session.send("Working in progress");
		// TODO: implement
	}
])

bot.dialog("flight-planning", [
	(session, results, next) => {
		let title = session.gettext("choose-an-option");
		let msg = new builder.Message(session)
			.text(title)
			.attachments([new builder.Keyboard(session)
				.buttons([
					builder.CardAction.imBack(session, session.gettext("where-can-i-go"), "where-can-i-go"),
					builder.CardAction.imBack(session, session.gettext("i-want-to-go"), "i-want-to-go")
				])
			]);
		builder.Prompts.text(session, msg);
	},
	(session, results, next) => {
		let message = session.message.text.toLowerCase();
		if(message.includes("where")) {
			session.beginDialog("where-can-i-go");
		} else if(message.includes("want")) {
			session.beginDialog("want-to-go");
		}
	}
])

bot.dialog("where-can-i-go", [
	(session, results, next) => {
		let title = session.gettext("when-want-to-go");
		
		let msg = new builder.Message(session)
			.text(title)
			.attachments([new builder.Keyboard(session)
				.buttons([
					builder.CardAction.imBack(session, session.gettext("weekdays"), "weekdays"),
					builder.CardAction.imBack(session, session.gettext("weekend"), "weekend"),
					builder.CardAction.imBack(session, session.gettext("anytime"), "anytime")
				])
			]);

		builder.Prompts.text(session, msg);
	},
	(session, results, next) => {

		let title = session.gettext("which-departure-airport");

		let cityFB = "Barcelona";
		// hint by FB Graph API
		// To be calculated by the backend

		let msg = new builder.Message(session)
			.text(title)
			.attachments([new builder.Keyboard(session)
				.buttons([
					builder.CardAction.imBack(session, cityFB, cityFB)
				])
			]);

		builder.Prompts.text(session, msg);
	},
	(session, results, next) => {
		let message = session.message.text.toLowerCase();
		let recomendations = [
			{
        countryName: "United Kingdom",
        countryId: "abc",
				priceFrom: 123,
				imageUrl: "https://www.elnacional.cat/uploads/s1/23/28/12/6/DHiit56XoAI2IKB_1_630x630.jpg"
			},
			{
        countryName: "Germany",
        countryId: "cba",
				priceFrom: 321,
				imageUrl: "https://www.elnacional.cat/uploads/s1/23/28/12/6/DHiit56XoAI2IKB_1_630x630.jpg"
			}
		]

    let elements = [];

		for(let recomendation of recomendations.slice(0, 4)) {
			let elem = {
        // picture, title(country name), price from 
        title: recomendation.countryName,
        subtitle: session.gettext("price-from", recomendation.priceFrom),
        image_url: recomendation.imageUrl,
        buttons: [
          {
            type: "postback",
            title: session.gettext("view-cities"),
            payload: recomendation.countryId
          }
        ]
      }

      elements.push(elem);
		}
    
    let msg = new builder.Message(session).sourceEvent({
      //specify the channel
      facebook: {
        //format according to channel's requirements
        //(in our case, the above JSON required by Facebook)
        attachment: {
          type: "template",
          payload: {
            "template_type": "list",
            "top_element_style": "compact",
            elements,
            "buttons": [
              {
                "title": "View More",
                "type": "postback",
                "payload": "payload"            
              }
            ]  
          }
        } //end of attachment
      }
    })
		
		// builder.Prompts.text(msg);
		session.send(msg);
    
	}
])




bot.use({
	botbuilder: [
		(session, next) => {
			let message = session.message.text.toLowerCase();
			if(message === 'clear') {
				session.userData = {};
				session.privateConversationData = {};
				session.conversationData = {};
				session.dialogData = {};
				session.send("restarting conversation");
				session.endConversation();//: session.beginDialog('/');
			}
			else next();
		}
	]
})