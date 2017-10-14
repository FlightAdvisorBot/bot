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
		defaultLocale: "es"
	}
});

//hook up bot endpoint
app.post("/api/messages", connector.listen());



bot.dialog("/", [
	(session, results, next) => {

		let card = new builder.HeroCard()
			.title("what-do-you-want-to-do")
			.buttons([
				builder.CardAction.imBack(session, "manage-saving-fund", "manage-saving-fund"),
				builder.CardAction.imBack(session, "flight-planning", "flight-planning")
			])
		
		let msg = new builder.Message(session)
			.attachments([card]);

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
		let card = new builder.HeroCard()
			.title("choose-an-option")
			.buttons([
				builder.CardAction.imBack(session, "program-saving", "program-saving"),
				builder.CardAction.imBack(session, "transfer-money", "transfer-money")
			])
		
		let msg = new builder.Message(session)
			.attachments([card]);
		builder.Prompts.text(session, msg);
	},
	(session, results, next) => {
		
	}
])

bot.dialog("flight-planning", [
	(session, results, next) => {
		let card = new builder.HeroCard()
			.title("choose-an-option")
			.buttons([
				builder.CardAction.imBack(session, "where-can-i-go", "where-can-i-go"),
				builder.CardAction.imBack(session, "i-want-to-go", "i-want-to-go")
			])
		
		let msg = new builder.Message(session)
			.attachments([card]);
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
		let card = new builder.HeroCard()
			.title("when-want-to-go")
			.buttons([
				builder.CardAction.imBack(session, "weekdays", "weekdays"),
				builder.CardAction.imBack(session, "weekend", "weekend"),
				builder.CardAction.imBack(session, "i-dont-care", "i-dont-care")
			])
		
		let msg = new builder.Message(session)
			.attachments([card]);
		builder.Prompts.text(session, msg);
	},
	(session, results, next) => {
		let cityFB = "Barcelona";
		// To be calculated by the backend

		let card = new builder.HeroCard()
			.title("which-departure-airport")
			.buttons([
				builder.CardAction.imBack(session, cityFB, cityFB)
			])
		
		let msg = new builder.Message(session)
			.attachments([card]);

		builder.Prompts.text(session, msg);
	},
	(session, results, next) => {
		let message = session.message.text.toLowerCase();
		let recomendations = [
			{
				from: "Barcelona",
				to: "Madrid",
				price: "125",
				url: "http://google.es"
			},
			{
				from: "Barcelona",
				to: "Bilbao",
				price: "130",
				url: "http://google.es"
			}
		]

		let cards = [];

		for(let recomendation of recomendations) {
			let card = new builder.HeroCard()
				.title(`${recomendation.to} for ${recomendation.price}`)
				.buttons([
					builder.CardAction.openUrl(session, recomendation.url, "More info")
				])
			cards.push(card);
		}

		let msg = new builder.Message(session)
			.attachments(cards);
		
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