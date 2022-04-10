const AWS = require('aws-sdk');

//
// Load Config and setup AWS
//
let config = require('../config/dev.json').config;
if (process.env.NODE_ENV === "prod") {
  config = require('../config/prod.json').config;
}
else if (process.nv.NODE_ENV != "dev"){
  throw new error("NODE_ENV not set")
}

AWS.config.update({
  region: config.AWSregion,
  accessKeyId: config.dynamoDBAccessKeyID,
  secretAccessKey: config.dynamoDBSecretKey
})
const docClient = new AWS.DynamoDB.DocumentClient();

//
//  Exposed Functionality
//
module.exports = {
    config: config,
    tables: config.dynamoDBTables,
    /**
     * 
     * @param {object} item 
     * @param {string} table 
     * @description Puts an object into a dynamoDB table. Overwrites previous object.
     */
    put(item, table){
        const params = {
            TableName: table,
            Item: item
        }
      
        docClient.put(params, (err) => {
          if (err) {
            throw "Unable to save record, err" + error
          } else {
            console.log("Successful put")
          }
        })
    }
}