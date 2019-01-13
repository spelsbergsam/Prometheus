import React from 'react';

import {
  Button,
  ProgressCircle
} from 'react-desktop/windows';

import PropTypes from 'prop-types';

import Dropdown from '../Shared/Dropdown';
import FieldSet from '../Shared/FieldSet';
import InputBox from '../Shared/InputBox';

const keep = [];
const messages = [];

class SpeechAi extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      utterance: null,
      currentVoice: this.props.voices[1]
    };
    this.say("Hello, I am Prometheus. Ask me any question and I will try to answer it.").then(() => {
      this.say("To get started, say \"Okay Prometheus,\" followed by a question.").then(() => {
        this.inputLoop();
      });
    });
  }

  async inputLoop() {
    let hotwords = ['okay Prometheus', 'OK Prometheus'];
    while (true) {
      try {
        let command = null;
        let hotwordIndex = -1;
        let userTextHistory = '';
        let userSpeech = Array.from((await this.listen())[0]);
        userSpeech = userSpeech.filter(i => i.confidence > 0.7).map(i => i.transcript);
        userTextHistory = userSpeech[0];
        console.log(userSpeech);
        for (let speech of userSpeech) {
          for (let hotword of hotwords) {
            if (speech.includes(hotword)) {
              userTextHistory = speech;
              command = speech.substring(speech.indexOf(hotword) + hotword.length);
            }
          }
        }
        messages.push(<span key={messages.length} style={{
          color: 'red'
        }}>{userTextHistory}</span>);
        if (command !== null) {
          console.log(command);
          let max = this.maxSimilarity(command.toLowerCase(), this.props.FAQs.map(i => i.question));
          console.log({
            ...max,
            closestQuestion: this.props.FAQs[max.index]
          });
          if (max.similarity > 0.7) {
            await this.say(this.props.FAQs[max.index].answer);
            await this.say('The source of this information is ' + this.props.FAQs[max.index].source);
          } else {
            await this.say('I\'m sorry, but I do not know the answer right now.');
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
  }

  async say(sentence) {
    messages.push(<span key={messages.length} style={{
      color: 'blue'
    }}>{sentence}</span>);
    return new Promise((resolve, reject) => {
      var utterThis = new SpeechSynthesisUtterance(sentence);
      utterThis.voice = this.state.currentVoice;
      window.speechSynthesis.speak(utterThis);
      utterThis.onend = e => {
        resolve(e.elapsedTime);
      };
      this.setState({
        utterance: utterThis
      });
      keep.push(utterThis);
    });
  };

  async listen() {
    return new Promise((resolve, reject) => {
      var recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition || window.msSpeechRecognition)();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 5;
      recognition.start();
      recognition.onresult = function(event) {
        resolve(Array.from(event.results));
      };
    });
  };

  similarity(s1, s2, first=true) {
    s1 = s1.split(' ');
    s2 = s2.split(' ');
    let hits = 0;
    for (let w1 of s1) {
      if (s2.includes(w1)) {
        hits++;
      }
    }
    if (first) {
      return (this.similarity(s2.join(' '), s1.join(' '), false) + hits / s1.length) / 2;
    } else {
      return hits / s1.length;
    }
  };

  maxSimilarity(s1, a1) {
    let max = -Infinity;
    let index = -1;
    console.log(s1);
    for (let i = 0; i != a1.length; i++) {
      let sim = this.similarity(s1, a1[i]);
      if (sim > max) {
        max = sim;
        index = i;
      }
    }
    return {
      similarity: max,
      index
    };
  };

	render() {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          fontFamily: 'Roboto, Ubuntu, sans-serif',
          alignItems: 'center'
        }}
      >
        <div
          style={{
            display: 'none'
          }}
        >
          <Dropdown
          label="Accent"
          defaultIndex={1}
          width="300px"
          onChange={i => {
            this.setState({
              currentVoice: this.props.voices[i]
            });
            if (this.state.utterance) {
              this.state.utterance.voice = this.props.voices[i];
            }
          }}
          >{Array.from(this.props.voices.map(i => i.name))}</Dropdown>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            paddingLeft: '32px',
            maxWidth: '600px'
          }}
        >{
          messages.map((e, i) => (
            <div
              key={i}
              style={{
                padding: '16px 0 16px 0'
              }}
            >{e}</div>
          ))
        }</div>
      </div>
    );
	}
}

SpeechAi.defaultProps = {
  FAQs: [],
  voices: speechSynthesis.getVoices()
};

SpeechAi.propTypes = {
  FAQs: PropTypes.array,
  voices: PropTypes.array
};

export default SpeechAi
