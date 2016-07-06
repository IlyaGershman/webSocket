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
  var unansweredMsgs = 0;

  function WebSocketWrapper(){
    this.socket = {};

    this.open = function () {

      this.socket = new WebSocket('ws://echo.websocket.org');
      console.log(this.socket);

      // making sure that if we receive error text field will be disabled and status text receive red font color
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
        li.innerHTML = '<div><div class="message">'+ message.msg +'</div><div style="color: red; float: right;"> waiting...</div></div>';
        li.setAttribute('id', 'li'+counterM);
        messagesList.insertBefore(li, messagesList.firstChild);
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
          li.innerHTML = '<div><div class="message">'+ text +'</div><div style="color: green; float: right"> ' +
          'processed(' + messagesM[index].timeDifference.toFixed(3) + 'ms)</div></div>';

          //li.innerHTML = '<tr><td>'+ text +'</td><td>processed(' + messagesM[index].timeDifference + 'ms)</td></tr>';
        };
        // clearing the text area
        messageField.value = '';
      } else {
        // making sure that socket is on ready state
        if (this.socket.readyState < 3){
          // the message was sent for test purpose from 'isAlive' function.
          // Using the same technique with array to calculate time difference properly
          this.socket.send(message.msg);
          messagesT[message.msg] = message;
          this.socket.onmessage = function (event) {
            var date3 = new Date();
            messagesT[event.data].timeDifference = (date3 - messagesT[event.data].timeStart)/1000;
          }
        }else{
          // if socket is not on ready state trying to open it once again
          this.open();
          messagesT = [];
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

        // when the program starts we take cookies, check if they exist, parse them and calculating the average.
        // if there are no cookies we get first timeDifference as an average
        if (messagesT.length === 1){
            var lastAverageFromCookies = readCookie('avgTime');
            lastAverageFromCookies ? lastAverageFromCookies = parseFloat(lastAverageFromCookies) : lastAverageFromCookies = 0;
            if (messagesT[0].timeDifference){
              if(lastAverageFromCookies === 0)
                lastAverageFromCookies = messagesT[0].timeDifference;

              average = ((messagesT[0].timeDifference + lastAverageFromCookies)/2).toFixed(3);
              createCookie('avgTime', average / counter, 1);
            } else {
              average = ((2000 + lastAverageFromCookies)/2).toFixed(3);
            }
        } else {
          // circling through the array and summarising all the times
          var counter = 0;
          messagesT.forEach(function (entry, index) {
            if (entry.timeDifference){
              average += entry.timeDifference;
              // creating counter to make sure that if there is no 'timeDifference' property our calculations would be correct
              counter++;
            } else {
              // if there are messages without timeDifference it means that server didn't answer
              unansweredMsgs++;
            }
          });
          // saving cookies with last average
          createCookie('avgTime', average / counter, 1);

          // calculating time of all messages without answer
          var unansweredTime = 2 + 2*(unansweredMsgs-1);
          unansweredTime === 2 ? unansweredTime = 0 : unansweredTime;

          // adding a random number to demonstrate color changing of '#stat' panel
          // adding unansweredTime
          average = ((average/ counter + unansweredTime * 1000 +Math.floor((Math.random() * 14) + 1)).toFixed(3));
          unansweredMsgs = 0;

          // making a drop point if testmessages array becomes too large and it would be complicated for client make calculations
          if(messagesT[messagesT.length-1].timeDifference && messagesT.length > 42){
            messagesT = [];
            counterT = 0;
          }
        }
      }
      if (average){
        // adding information to the screen
        time.innerHTML = 'Average time: ' + average + 'ms';
        // calculating 'r' and 'g' to make sure the color would be graduantaly changed
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
    if (wsForForm.socket.readyState < 3){
      wsForForm.send(message);
    } else {
      messageField.disabled = true;
      wsForForm.open();
    }

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

  // cookies pusher/reader/eraser
  function createCookie(name,value,days) {
    if (days) {
      var date = new Date();
      date.setTime(date.getTime()+(days*24*60*60*1000));
      var expires = "; expires="+date.toGMTString();
    }
    else var expires = "";
    document.cookie = name+"="+value+expires+"; path=/";
  }

  function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
      var c = ca[i];
      while (c.charAt(0)==' ') c = c.substring(1,c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
  }

  function eraseCookie(name) {
    createCookie(name,"",-1);
  }
};