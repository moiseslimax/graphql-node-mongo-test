const express = require("express");
const bodyParser = require("body-parser");
const graphqlHttp = require("express-graphql");
const { buildSchema } = require("graphql");
const mongoose = require("mongoose");
const Event = require("./models/event");
const User = require("./models/user");
const bcrypt = require("bcryptjs");

const app = express();

app.use(bodyParser.json());

app.use(
  "/graphql",
  graphqlHttp({
    schema: buildSchema(`
        type Event {
            _id: ID!
            title: String!
            description: String!
            price: Float!
            date: String!
        }

        type User {
            _id: ID!
            email: String!
            password: String
        }

        input EventInput {
            title: String!
            description: String!
            price: Float!
            date: String!
        }

        input UserInput {
            email: String!
            password: String
        }

        type RootQuery {
            events: [Event!]!
        }
        type RootMutation {
            createEvent(eventInput: EventInput): Event
            createUser(userInput: UserInput): User
        }
        schema {
            query: RootQuery
            mutation: RootMutation
        }
    `),
    rootValue: {
      events: () => {
        return Event.find()
          .then(events => {
            return events.map(event => {
              return { ...event._doc, _id: event._doc._id.toString() };
            });
          })
          .catch();
      },

      createEvent: args => {
        const event = new Event({
          title: args.eventInput.title,
          description: args.eventInput.description,
          price: +args.eventInput.price,
          date: new Date(args.eventInput.date)
        });
        return event
          .save()
          .then(res => {
            console.log(res);
            return { ...res._doc };
          })
          .catch(err => {
            console.log(err);
            throw err;
          });
      },

      createUser: args => {
          return User.findOne({ email: args.userInput.email })
            .then(user => {
              if(user) {
                throw new Error('User exist already.');
              }
              return bcrypt
              .hash(args.userInput.password, 12)
            })        
          .then(newPass => {
            const user = new User({
              email: args.userInput.email,
              password: newPass
            });
            return user.save();
          })
          .then(result => {
            return { ...result._doc, password: null };
          })
          .catch(err => {
            console.log(err);
          });
      }
    },
    graphiql: true
  })
);

mongoose
  .connect(
    `mongodb+srv://adminx:${
      process.env.MONGO_PASSWORD
    }@cluster0-o2mga.mongodb.net/${
      process.env.MONGO_DB
    }?retryWrites=true&w=majority`,
    { useNewUrlParser: true }
  )
  .then(() => {
    console.log("Conexao com o banco OK, ligando node na porta 3000");
    app.listen(3000);
  })
  .catch(err => {
    console.log(err);
  });
