//loading modules
const express = require("express");
const builder = require("botbuilder");
const request = require("request-promise");
const locationDialog = require('botbuilder-location');
const continents = require("./places.json").Continents;
const APIUrl = "https://flightadvisorbackend.herokuapp.com";
const FB_API_KEY = process.env.FB_API_KEY;
const FB_URL = "https://graph.facebook.com/v2.6/";
const _ = require("lodash");

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

let optionsWelcomeIntent = {
  recognizers: [new builder.LuisRecognizer({
    "en": process.env.LUIS_URL_EN_WELCOME
  })]
}

bot.library(locationDialog.createLibrary(process.env.BING_MAPS_API_KEY));

bot.dialog('/', [
  (session, results, next) => {
    let name = session.message.address.user.name.split(" ")[0];
    session.send("welcome-message", name);

    session.userData.money = 100;

    let options = {
			prompt: "Tell us where it's going to be your travel origin normally.",
			repropmt: "I can't find that location, try it again.",
      useNativeControl: true,
      reverseGeocode: true,
			skipFavorites: true,
			skipConfirmationAsk: true
    };
		locationDialog.getLocation(session, options);
  },
  (session, results, next) => {
    session.send("Let's continue!");
    session.userData.origin = results.response.locality ? results.response.locality : results.response.region;
    // TODO: Request to know nearest shops
    session.userData.origin = searchCodeLocation(session.userData.origin);
		session.beginDialog("welcome");
	}
])

let rootDialog = new builder.IntentDialog(optionsWelcomeIntent)
  .onBegin((session, results) => {

    let test = session.gettext("what-do-you-want-to-do");
    let msg = new builder.Message(session)
      .text(test)
      .attachments([new builder.Keyboard(session)
        .buttons([
          builder.CardAction.imBack(session, session.gettext("manage-saving-fund"), "manage-saving-fund"),
          builder.CardAction.imBack(session, session.gettext("flight-planning"), "flight-planning")
        ])
      ]);

    session.send(msg);
  })
  .onDefault((session, results, next) => {
    session.send("I'm so sorry but I don't understand that.")
  })
  .matches("manageMoney", "saving-fund")
  .matches("planFlight", "flight-planning")

bot.dialog("welcome", rootDialog);

// bot.dialog("/", [
// 	(session, results, next) => {
    
// 	},
// 	(session, results, next) => {

// 		let message = session.message.text.toLowerCase();
// 		if(message.includes("fund")) {
// 			session.beginDialog("saving-fund");
// 		} else if(message.includes("flight")) {
// 			session.beginDialog("flight-planning");
// 		}

// 	}
// ])

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
    if(results && results.entities && results.entities.length > 0){
      for(let entity of results.entities) {
        if(entity.type == "builtin.geography.country") {
          session.userData.destination = searchCodeLocation(entity.entity[0].toUpperCase() + entity.entity.slice(1));
        }
      }
    }
    session.beginDialog("when-and-where");
		
	},
	(session, results, next) => {
    
    session.userData.origin = results.where;
    session.userData.when = results.when[0].toUpperCase() + results.when.slice(1);
    
    if(session.userData.destination) return next();

    request({
      url: APIUrl + "/countries",
      qs: {
        origin: session.userData.origin,
        locale: session.preferredLocale(),
        availability: session.userData.when
      },
      json: true
    })
      .then((recomendations) => {
    
        let elements = [{
          title: "TOP 3 cheapest countries to visit",
          subtitle: "Press on 'Check more expensive countries' if any of the list suits your preferences",
          image_url: "https://www.elnacional.cat/uploads/s1/23/28/12/6/DHiit56XoAI2IKB_1_630x630.jpg"
        }];
    
    
        for(let recomendation of recomendations.slice(0, 3)) {
          if (recomendation.price < session.userData.price) continue;
          let elem = {
            // picture, title(country name), price from 
            title: recomendation.destination,
            subtitle: session.gettext("price-from", recomendation.price),
            image_url: recomendation.imgUrl,
            buttons: [
              {
                type: "postback",
                title: session.gettext("view-cities"),
                payload: recomendation.countryId ? recomendation.countryId : recomendation.destination
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
                "top_element_style": "large",
                elements,
                "buttons": [
                  {
                    "title": "Check more countries",
                    "type": "postback",
                    "payload": "payload"            
                  }
                ]  
              }
            } //end of attachment
          }
        })
        
        builder.Prompts.text(session, msg);
        
      })
      .catch((err) => {
        console.log(err);
      })
  },
  (session, results, next) => {

    let placeId;
    if(results) placeId = searchCodeLocation(results.response);
    else placeId = session.userData.destination;
    // TODO: http get request to skyscanner api to get flights to placeId country

    request({
      url: APIUrl + "/flights",
      qs: {
        origin: session.userData.origin,
        locale: session.preferredLocale(),
        availability: session.userData.when,
        destination: placeId
      },
      json: true
    })
      .then((resp) => {
        console.log(resp);
        let flights = resp;
        let elements = [{
          title: `TOP 3 cheapest cities to go`,
          subtitle: "Press on 'Check more cities' if any of the list suits your preferences" ,
          image_url: "https://www.elnacional.cat/uploads/s1/23/28/12/6/DHiit56XoAI2IKB_1_630x630.jpg"
        }];
        
        for(let flight of flights.slice(0, 3)) {
          let elem = {
            // picture, title(country name), price from 
            title: `From ${flight.origin} to ${flight.destination} for ${flight.price}€`,
            subtitle: `Outbound: ${flight.outboundDate}\nReturn: ${flight.inboundDate}`,
            image_url: flight.imgUrl,
            buttons: [
              (flight.price < session.userData.money) ? {
                  type: "postback",
                  title: "View more flights",
                  payload: flight.destination
                }
                : {
                  type:"web_url",
                  url:"https://www.imaginbank.com/prestamo-imagin_es.html",
                  title :"Loan info",
                  webview_height_ratio: "full"
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
                    "title": "Check more cities",
                    "type": "postback",
                    "payload": "payload"            
                  }
                ]  
              }
            } //end of attachment
          }
        })
            
        builder.Prompts.text(session, msg);
      })
      .catch(err => {
        console.log(err);
      })

    let flights = [
      {
        price: 123,
        origin: "Barcelona",
        destination: "London Gatwick",
        returnDate: "13/11/2017",
        outboundDate: "10/11/2017",
        flightNum: "VY4343",
        imageUrl: "https://www.elnacional.cat/uploads/s1/23/28/12/6/DHiit56XoAI2IKB_1_630x630.jpg"
      },
      {
        price: 321,
        origin: "Barcelona",
        destination: "Manchester",
        returnDate: "17/11/2017",
        outboundDate: "14/11/2017",
        flightNum: "VY4343",
        imageUrl: "https://www.elnacional.cat/uploads/s1/23/28/12/6/DHiit56XoAI2IKB_1_630x630.jpg"
      }
    ]

    
    
  },
  (session, results, next) => {
    console.log(results);
  }
])

bot.dialog("when-and-where", [
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

    // TODO: check that it's a correct answer
    let when = session.message.text.toLowerCase();

    session.dialogData.when = when;

    if(session.userData.origin) return next();

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
    let where = session.userData.origin || session.message.text.toLowerCase();
    session.endDialogWithResult({ where,
                                  when: session.dialogData.when });
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




function searchCodeLocation(locationName) {
  for(let continent of continents) {
    for(let country of continent.Countries) {
      if(country.Name === locationName) return country.Id;
      for(let city of country.Cities) {
        if(city.Name === locationName) return city.IataCode;
      }
    }
  }
  return null;
}