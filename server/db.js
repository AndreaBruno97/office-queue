'use strict';

const sqlite = require('sqlite3').verbose();
const env = process.env.NODE_ENV;
var DBSOURCE = env === 'test' ? './test/office-queue-test.db' :  './office-queue.db' ;
/*
if(process.env.NODE_ENV.localeCompare('test')){
  
    var DBSOURCE = "./test/office-queue-test.db";
    
} 
else{
    var DBSOURCE = "./office-queue.db";     
}
  */ 

console.log('env=' + process.env.NODE_ENV)
console.log('dbsource=' + DBSOURCE)

const db = new sqlite.Database(DBSOURCE, (err) => {
    if (err) {
        // Cannot open database
        console.error(err.message);
        throw err;
    }
});

module.exports = db;