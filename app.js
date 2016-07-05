window.onload = function() {

  var form = document.getElementById('message-form');
  var messageField = document.getElementById('message');
  var messagesList = document.getElementById('messages');
  var socketStatus = document.getElementById('status');
  var closeBtn = document.getElementById('close');
  var time = document.getElementById('timer');
  var statBar = document.getElementById('stat');

  // these variables would be used to make sure that every message's response time is calculated correctly
  var messagesT = [];
  var messagesM = [];
  var counterT = 0;
  var counterM = 0;

  function WebSocketWrapper(){
    this.socket = {};

    this.open = function () {

      this.socket = new WebSocket('ws://echo.websocket.org');

      // making sure that if we receive error text field will be disabled and status test receive red font color
      this.socket.onerror = function(error) {
        socketStatus.innerHTML = 'Can\'t connect to: ' + event.currentTarget.url;
        socketStatus.className = 'failed';
        messageField.value = '';
        messageField.disabled = true;

        console.log('WebSocket Error: ' + JSON.stringify(error));
        return false;
      };

      // when connected making text area enabled and and status color green
      this.socket.onopen = function (event) {
        messageField.disabled = false;
        socketStatus.innerHTML = 'Connected to: ' + event.currentTarget.url;
        socketStatus.className = 'open';
      };
    };

    this.close = function () {
      this.socket.close();
    };

    this.send = function (message) {
      // checking if the message is submitted by user or our test using test property that adds in 'isAlive' function
        if (!message.test){

          this.socket.send(JSON.stringify(message));
          // counter is used as an index of msgs array to keep control on messages that will be
          // received from server and makign sure that they won't get mixed as we discussed
          messagesM[counterM] = message;

          // creating li's with 'waiting message' adding an id to li to use it when the response from server is received
          var li = document.createElement('li');
              li.setAttribute('class','sent');
              li.innerHTML = '<span>Sent:</span> waiting...';
              li.setAttribute('id', 'li'+counterM);
          messagesList.appendChild(li);
          // next message wil receive index++ in the array
          counterM++;

          this.socket.onmessage = function (event) {
            // parsing server's response getting index, message and startTime
            var index = JSON.parse(event.data).counter;
            var text = JSON.parse(event.data).msg;
            var startDate = JSON.parse(event.data).timeStart;
            var date2 = new Date();

            //calculating time difference to add it to li element
            messagesM[index].timeDifference = (date2.getTime() - startDate)/1000;

            //find proper li by id using index in the server's response
            var li = document.getElementById('li'+index);
                li.innerHTML = '<span>Received:</span>' + text + '  (' + messagesM[index].timeDifference + ')';
          };
          // clearing the text area
          messageField.value = '';
        } else {
          // the message was sent for test purpose from 'isAlive' function.
          // Using the same technique with array to calculate time difference properly
          this.socket.send(message.msg);
          messagesT[message.msg] = message;
          this.socket.onmessage = function (event) {
            var date3 = new Date();
            messagesT[event.data].timeDifference = (date3 - messagesT[event.data].timeStart)/1000;
          }
        }
    };
  }

  function KeepAlive(wsObject){
    this.socket = wsObject;

    // checking that serves is alive by sending a test message. In message object creating property test to use it in
    // WebSocketWrapper method 'send'
    this.isAlive = function () {
      var date = new Date();
      this.socket.send({msg: counterT, timeStart: date.getTime(), test: true});
      //counter is used for the possibility to control timestamps and calculating time intervals.
      counterT++;
    };

    // the method calculates average time that took server to respond
    this.getAverageRoundTripTime = function () {
      //making sure that we have messages and messageField is not disabled
      if (messagesT.length > 0 && !messageField.disabled){
        var average = 0;
        var counter = 0;
        // circling through the array and summarising all the times
        messagesT.forEach(function (entry, index) {
          if (entry.timeDifference){
            average += entry.timeDifference;
            // creating counter to make sure that if there is no 'timeDifference' property our calculations would be correct
            counter++;
          }
        });
        // adding a random number to demonstrate color changing of '#stat' panel
        average = (average / counter + Math.floor((Math.random() * 14) + 1)).toFixed(3);
      }
      if (average){
        // adding information to the screen
        time.innerHTML = average;
        // calculating 'r' and 'g' to make sure the color would be graduantlly changed
        var r = average * 21;
        var g = 255 - r;
        statBar.style.backgroundColor = rgbCreater(r,g,30);
      }
    }
  }

// creating an event listener for form submit button
  form.onsubmit = function(e) {
    e.preventDefault();

    // making sure the text field is active which would indicate that we can send messages to the server
    if (messageField.disabled){
      return;
    }
    var date = new Date();
    var message = {msg: messageField.value, timeStart: date.getTime(), counter: counterM};

    //using created instance to send message
    wsForForm.send(message);
  };

  // creating an event listener for form close connection button
  closeBtn.onclick = function(e) {
    e.preventDefault();
    // making sure the text field is active which would indicate that there's need to close connection
    if(messageField.disabled){
      return;
    }
    wsForForm.close();
    socketStatus.innerHTML = 'The connection has been closed';
    socketStatus.className = 'failed';
    messageField.value = '';
    messageField.disabled = true;
    return false;
  };



  // creating 2 instances from WebSocketWrapper class. I met a bug when tried to do everything with one instance.
  // if I pressed send button at the time that my test message was trying to use it program thought that my usual message was a test one.

  var wsForForm = new WebSocketWrapper();
  var wsForTest = new WebSocketWrapper();
  wsForForm.open();

  // creating testing instance
  var liveKeeper = new KeepAlive(wsForTest);

  // open it
  liveKeeper.socket.open();

  // setting intervals
  setInterval(function(){liveKeeper.isAlive()}, 2000);

  // the interval was set to 1999 to make sure that there is no undefined object in messagesT arrays
  setInterval(function(){liveKeeper.getAverageRoundTripTime()}, 1999);

  // rgb generator
  function rgbCreater(r, g, b){
    r = Math.floor(r);
    g = Math.floor(g);
    b = Math.floor(b);
    return ["rgb(",r,",",g,",",b,")"].join("");
  }
};
