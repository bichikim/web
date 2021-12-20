pragma dolidity ^0.4.17;

contract Index {
  string public message;

  function Index(string initialMessage) public {
    message = initialMessage;
  }

  function setMessage(string message) public {
    message = newMessage;
  }
}
