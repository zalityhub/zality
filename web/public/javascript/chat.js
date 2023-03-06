let bTextToSpeechSupported = false;
let bSpeechInProgress = false;
let oSpeechRecognizer = null
let oSpeechSynthesisUtterance = null;
let oVoices = [];
let tivl;


function stringify(obj, replacer, spaces, cycleReplacer) {
  return JSON.stringify(obj, serializer(replacer, cycleReplacer), spaces)
}

function serializer(replacer, cycleReplacer) {
  var stack = [], keys = []

  if (cycleReplacer == null) cycleReplacer = function (key, value) {
    if (stack[0] === value) return "[Circular ~]"
    return "[Circular ~." + keys.slice(0, stack.indexOf(value)).join(".") + "]"
  }

  return function (key, value) {
    if (stack.length > 0) {
      var thisPos = stack.indexOf(this)
      ~thisPos ? stack.splice(thisPos + 1) : stack.push(this)
      ~thisPos ? keys.splice(thisPos, Infinity, key) : keys.push(key)
      if (~stack.indexOf(value)) value = cycleReplacer.call(this, key, value)
    } else stack.push(value)

    return replacer == null ? value : replacer.call(this, key, value)
  }
}


function logDebug(text) {
  loggerText.value += (text + '\n');
  loggerText.scrollTop = loggerText.scrollHeight;
}

function cleanText(text, chs) {
  text = decodeURIComponent(text);
  text = text.split('\n');
  while (text.length && chs.indexOf(text[0]) >= 0)
    text = text.slice(1); //remove leading newlines
  while (text.length && chs.indexOf(text[text.length - 1]) >= 0)
    text.pop();   // remove trailing new lines
  return text.join('\n');
}

function keydown(key) {
  if (key.keyCode === 13)
    btnSend.click();
}

function addResponseText(text) {
  txtOutput.value += text;
  txtOutput.scrollTop = txtOutput.scrollHeight;
}

function OnLoad() {
  if (!('webkitSpeechRecognition' in window)) {
    lblSpeak.style.display = 'none';
    logDebug('speech to text not supported');
  } else {
    logDebug('speech to text is supported');
  }

  if ('speechSynthesis' in window) {
    logDebug('text to speech is supported');
    bTextToSpeechSupported = true;
    tivl = setInterval(() => {
      oVoices = window.speechSynthesis.getVoices();
      if (oVoices.length) {
        clearInterval(tivl);
        for (let i = 0; i < oVoices.length; i++)
          selVoices[selVoices.length] = new Option(oVoices[i].name, i);
        logDebug(`loaded ${oVoices.length} voices`);
      }
    }, 1000);    // one second after page loads
  } else {
    logDebug('text to speech not supported');
  }
}

function ChangeLang(o) {
  if (oSpeechRecognizer) {
    oSpeechRecognizer.lang = selLang.value;
  }
}

function Send() {
  const question = cleanText(theQuestion.value, '\n ');
  if (question === '') {
    alert('Enter a question');
    theQuestion.value = '';
    theQuestion.focus();
    return;
  }

  logDebug(`Asking: ${question}`);

  const oHttp = new XMLHttpRequest();
  oHttp.open('GET', `https://zality.com/chat?ask=${question}`);
  oHttp.setRequestHeader('Accept', 'application/json');

  oHttp.onerror = function (err) {
    return logDebug(stringify(err));
  }

  oHttp.onreadystatechange = function () {
    if (oHttp.readyState === 4) {
      logDebug(`state: ${oHttp.readyState}`);

      let response = oHttp.responseText;
      if (selLang.value !== 'en-US') {
        const a = response.split('?\n');
        if (a.length === 2) {
          response = a[1];
        }
      }

      response = cleanText(response, '\n ');
      if (response === '')
        response = 'No response';
      TextToSpeech(response);
      addResponseText(`Chat GPT: ${response}\n\n`);
    }
  }

  oHttp.send();

  addResponseText(`Me: ${question}\n`);
  theQuestion.value = '';
  theQuestion.focus();
}

function TextToSpeech(text) {
  if (!text || !bTextToSpeechSupported || chkMute.checked)
    return;

  try {
    oSpeechSynthesisUtterance = new SpeechSynthesisUtterance();

    const sVoice = selVoices.value;
    if (oVoices.length && sVoice && sVoice !== '')
      oSpeechSynthesisUtterance.voice = oVoices[parseInt(sVoice)];
    else
      return logDebug('no voice to use');

    oSpeechSynthesisUtterance.onend = function () {
      if (oSpeechRecognizer && chkSpeak.checked) {
        logDebug('finished talking - can now listen');
        oSpeechRecognizer.start();
      }
    }

    if (oSpeechRecognizer && chkSpeak.checked) {
      logDebug('do not listen to yourself when talking');
      oSpeechRecognizer.stop();
    }

    oSpeechSynthesisUtterance.lang = selLang.value;
    oSpeechSynthesisUtterance.text = text;
    window.speechSynthesis.speak(oSpeechSynthesisUtterance);
    logDebug(`Speaking ${text} in voice ${sVoice}`);
  } catch (err) {
    logDebug(`speaking error: ${err.message}`);
  }
}

function Mute(b) {
  if (b)
    selVoices.style.display = 'none';
  else
    selVoices.style.display = '';
}

function SpeechToText() {

  if (oSpeechRecognizer) {
    if (chkSpeak.checked)
      oSpeechRecognizer.start();
    else
      oSpeechRecognizer.stop();
    return;
  }

  oSpeechRecognizer = new webkitSpeechRecognition();
  oSpeechRecognizer.continuous = true;
  oSpeechRecognizer.interimResults = true;
  oSpeechRecognizer.lang = selLang.value;
  oSpeechRecognizer.start();

  oSpeechRecognizer.onresult = function (event) {
    let interimTranscripts = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;

      if (event.results[i].isFinal) {
        theQuestion.value = transcript;
        Send();
      } else {
        transcript.replace('\n', '<br>');
        interimTranscripts += transcript;
      }

      const oDiv = document.getElementById('idText');
      oDiv.innerHTML = '<span style="color: #999;">' + interimTranscripts + '</span>';
    }
  }

  oSpeechRecognizer.onerror = function (event) {
  }
}
