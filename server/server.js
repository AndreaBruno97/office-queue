const express = require('express');
const morgan = require('morgan');
const bodyParser = require("body-parser");
const counter_dao = require('./counter_dao.js');
const ticket_dao = require('./ticket_dao.js');
const request_type_dao = require('./request_type_dao.js')
const Ticket = require('./ticket.js');



const PORT = 3001;
app = new express();


//Here we are configuring express to use body-parser as middle-ware.
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Logger
app.use(morgan('tiny'));
app.use(express.json());
app.use(express.static('client'));

///////////////////////////////////
let queues = new Map();

function initializeQueue(){
    
    //get all request type and fill the map
    types = request_type_dao.listRequests();

    for (let index = 0; index < types.length; index++) {
        const element = types[index];
        let request = [];
        queues.set(element.tag_name, request);
        console.log(element.tag_name + 'inserted in the map');
        
    }
    console.log('works');
    ///////////////////////////////////
}


app.listen(PORT, ()=>{
    initializeQueue();
    console.log(`Server running on http://localhost:${PORT}/`);
});



//get all request type and fill the map
types = request_type_dao.listRequests();

for (let index = 0; index < types.length; index++) {
    const element = types[index];
    let request = [];
    queues.set(element.tag_name, request);
    console.log(element.tag_name + 'inserted in the map');
    
}



app.get('/', (req, res) => {
    res.json({
        "response": "ok"
    });
});

// REST API endpoints

// Resources: Counters, TICKETS, Request_type

// GET /counters
// Request body: empty
// Response body: Array of objects, each describing a Counter
// Errors: none
app.get('/counters', (req, res) => {
    counter_dao.listCounters()
      .then((counters) => res.json(counters) )
      .catch((err)=>res.status(503).json(dbErrorObj));
  });

  //GET request_type  /counter/id 
  // Get the request types served by a counter
app.get('/api/counter/:id', (req, res) => {
    counter_dao.get_requests(req.params.id)
    .then((requests) => res.json(requests) )
    .catch((err) => {
        res.status(500).json({errors: [{'param': 'Server', 'msg': err}],})
    });
        
});

//GET counters  /counters/request/tag
  // Get list of all counters that serve a specific request_type
  app.get('/api/counters/request/:tag', (req, res) => {
    counter_dao.get_counters(req.params.tag)
    .then((counters) => res.json(counters) )
    .catch((err) => {
        res.status(500).json({errors: [{'param': 'Server', 'msg': err}],})
    });
        
});

  //POST /counter
  //INSERT A COUNTER (NEW OR AN EXISTING ONE WITH A NEW REQUEST_TYPE)
app.post('/api/counter', (req,res) => {
    const counter = req.body;
    if(!counter || !counter.id){
        res.status(400).end();
    } else {
        counter_dao.create_counter(counter)
            .then((id) => res.status(201).json({"id" : id}))
            .catch((err) => {
                res.status(500).json({errors: [{'param': 'Server', 'msg': err}],})
            });
    }
});

//DELETE /counter/id
//delete all the entries of a counter with a specific id 
app.delete('/api/counter/:id', (req,res) => {
    counter_dao.delete_counter(req.params.id)
        .then((result) => res.status(204).json({'message': 'counter deleted'}))
        .catch((err) => res.status(500).json({
            errors: [{'param': 'Server', 'msg': err}],
        }));
});

//DELETE /counter/request_type
// Delete a specific request_type for a counter with a given id
app.delete('/api/counter/:id/:request', (req,res) => {
    counter_dao.delete_request_type(req.params.id, req.params.request)
        .then((result) => res.status(204).json({'message': 'counter deleted'}))
        .catch((err) => res.status(500).json({
            errors: [{'param': 'Server', 'msg': err}],
        }));
});
  /***********************TICKETS******************************************/
 
// GET LIST OF TICKETS 
app.get('/api/tickets', (req, res) => {
    var tickets =  ticket_dao.listTickets(); 
    //var tickets = {ticket_number:1, request_type: "posta", wait_time: "00:20:00" }
        res.status(201).json(tickets);
    
      
  });

//CREATE A NEW TICKET 
  app.post('/api/tickets', (req,res) => {
    const ticket = req.body;
    console.log(req.body) ; 
    if(!ticket || !ticket.request_type){
        res.status(400).end();
    } else {
        let ticketId = ticket_dao.create_ticket(ticket.request_type);
        res.status(201).json({
            "ticket_id": ticketId
          });
    }
});

/*
//CREATE A NEW TICKET 
app.post('/api/tickets', (req,res) => {
    const ticket = req.body;
    console.log(req.body) ; 
    if(!ticket || !ticket.request_type){
        res.status(400).end();
    } else {
        ticket_dao.create_ticket(ticket.request_type)
        let request = new Ticket(ticket.ticket_number , ticket.request_type , ticket.wait_time);
        var a = queues.get(ticket.request_type)
        a.push(request)
        queues.delete(ticket.request_type)
        queues.set(ticket.request_type , a)
        console.log(queues.get(ticket.request_type))
        res.status(201).json({"ticket_number": ticket.ticket_number});
     
        
    }
});
*/
function toSeconds(t) {
    var bits = t.split(':');
    return bits[0]*3600 + bits[1]*60 + bits[2]*1;
}



  

next_ticket = function(id) {
    let req_types = counter_dao.get_requests(id);
    var max = 0;
    var tag = "";
    var time = 0;
    for (let index = 0; index < req_types.length; index++) {
        //let request = queues.get(req_types[index]);
        let request = ticket_dao.get_tickets(req_types[index])
       
    if (request.length == max){
          var time2 = toSeconds(req_types[index].service_time);
          if(time2 < time){
            max = request.length;
            tag = req_types[index].tag_name;
            time = time2;
            continue;
          }
               
        }
        
       if (request.length > max){
           max = request.length;
           tag = req_types[index].tag_name;
        }
        
    }
    
   ticketss = queues.get(tag)
   var a = ticketss.shift();

   return a.ticket_number;
   
}

//GET next_ticket from a counter
app.get('/api/tickets/:id', (req, res) => {
    next_ticket(req.params.id).
    then(ticket_number =>res.json(ticket_number));
    
});


  //Get tikets  by request_type
  app.get('/api/tickets/:request_type', (req, res) => {
    var tickets =   ticket_dao.get_tickets(req.params.request_type); 
    var tickets = {ticket_number:1, request_type: "posta", wait_time: "00:20:00" }
  //  var a = queues.get(req.params.tag_name)
  //  res.status(201).json(a);

    
    
    
});


app.delete('/api/tickets/:ticket_number', (req,res) => {
    const ticket_number = req.params.ticket_number; 
    console.log("ticket_number", ticket_number); 
    if(!ticket_number ){
        res.status(400).end();
    } else {
        var m= ticket_dao.remove_ticket(ticket_number); 
        res.status(201).json({
            message: m
          });
    }
   
        
});

  /*********************************************************************** */

  // GET /request type
// Request body: empty
// Response body: Array of objects, each describing a Request_type
// Errors: none
app.get('/request_type', (req, res) => {
    request_type_dao.listRequests()
      .then((requests) => res.json(requests) )
      .catch((err)=>res.status(503).json(dbErrorObj));
  });

  //GET service_time  /request_type/<tag_name> 
  //Get the service time of a request_type
app.get('/api/request_type/:tag_name', (req, res) => {
    request_type_dao.get_service_time(req.params.tag_name)
        .then((service_time) => {
            if(!service_time){
                res.status(404).send();
            } else {
                res.json(service_time);
            }
        })
        .catch((err) => {
            res.status(500).json({
                errors: [{'param': 'Server', 'msg': err}],
            });
        });
});

  //POST /request_type
  //create a new request_type
app.post('/api/request_type', (req,res) => {
    const request_type = req.body;

    if(!request_type || !request_type.tag_name || !request_type.service_time){
        res.status(400).end();
    } else {
        request_type_dao.create_request_type(request_type)
            .then((id) => res.status(201).json({"id" : id}))
            .catch((err) => {
                res.status(500).json({errors: [{'param': 'Server', 'msg': err}],})
            });
        let request = []
        queues.set(request_type.tag_name, request )
    }
});

//DELETE /request_type/<tag_name>
app.delete('/api/request_type/:tag_name', (req,res) => {
    request_type_dao.delete_request_type(req.params.tag_name)
        .then((result) => res.status(204).json({'message': 'Request_type deleted'}))
        .catch((err) => res.status(500).json({
            errors: [{'param': 'Server', 'msg': err}],
        }));
});

//PUT /request_type/<tag_name>
//Update the service time of an existing request_type with a given tag_name. 
app.put('/api/request_type/:tag_name', (req,res) => {
    if(!req.body.service_time){
        res.status(400).end();
    } else {
        const service_time = req.body.service_time;
        request_type_dao.update_request_type(req.params.tag_name,service_time)
            .then((result) => res.status(200).json({'message': 'Service_time updated'}))
            .catch((err) => res.status(500).json({
                errors: [{'param': 'Server', 'msg': err}],
            }));
    }
});

//PUT /change/request_type/<tag_name>
//Change the tag_name of an existing request_type with a given tag_name.
app.put('/api/request_type/change/:tag_name', (req,res) => {
    if(!req.body.tag_name){
        res.status(400).end();
    } else {
        const new_tag_name = req.body.tag_name;
        request_type_dao.change_tag_name(req.params.tag_name, new_tag_name)
            .then((result) => res.status(200).json({'message': 'Tag_name changed'}))
            .catch((err) => res.status(500).json({
                errors: [{'param': 'Server', 'msg': err}],
            }));
    }
});


module.exports= app;