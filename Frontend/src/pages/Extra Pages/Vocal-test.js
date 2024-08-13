import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardBody, Button,Spinner } from 'reactstrap';
import Knob from 'pages/AllCharts/knob/knob';
import CollapsibleList from './Collapse-list';
import SpeechRecognition,{ useSpeechRecognition } from 'react-speech-recognition';
import { setBreadcrumbItems } from "../../store/actions";
import { connect } from "react-redux"
const VocalTest=(props)=>{
    const [userResponse, setUserResponse] = useState('');
    const [question, setQuestion] = useState('');
    const [timer, setTimer] = useState(300); // 10 minutes in seconds
    const [testStarted, setTestStarted] = useState(false);
    const [loadingResults, setLoadingResults] = useState(false);
    const [value_cur,setvalue_cur]=useState(0);
    const [results, setResults] = useState(null);
    const startTest = () => {
        setTestStarted(true);
        fetchQuestion();
    };
    const { transcript, listening, resetTranscript, startListening, stopListening } = useSpeechRecognition();

const startListeningToUser = () => {
    resetTranscript(); // Reset transcript at the beginning of listening
    SpeechRecognition.startListening({ continuous: true }); // Start listening continuously
};
const breadcrumbItems = [
    { title: "SpeakEZ", link: "#" },
    { title: "Vocal Test", link: "#" },
]
useEffect(() => {
    props.setBreadcrumbItems('Vocal test', breadcrumbItems);
})
const stopListeningAndHandleSubmit = () => {
    SpeechRecognition.stopListening(); // Stop listening
    setUserResponse(transcript); // Set the userResponse state to the current transcript
    handleSubmit(); // Then, submit the response as before
};
    const timerStyle = {
        fontSize:'24px',
        fontWeight:'bold',
        color: timer < 60? 'red' : 'black' // Change to red color when less than 1 minute left
    };
    const formatTime = () => {
        const minutes = Math.floor(timer / 60);
        const seconds = timer % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };
    useEffect(() => {
        if (testStarted) {
            // Start the timer when the test starts
            const interval = setInterval(() => {
                setTimer(prevTimer => prevTimer - 1);
            }, 1000);

            // Clear interval when timer reaches 0
            if (timer === 0) {
                clearInterval(interval);
                handleSubmit();
            }

            return () => clearInterval(interval);
        }
    }, [testStarted, timer]);
    const fetchQuestion = () => {
        axios.get(`http://localhost:4000/ai/Random-text`)
            .then(response => {
                setQuestion(response.data.Random_Text);
            })
            .catch(error => {
                console.error('Error fetching question:', error);
            });
    };
    const handleSubmit = () => {
        console.log(userResponse)
        setLoadingResults(true);
        for (let i = 1; i <= 100; i++) {
            setTimeout(() => {
              setvalue_cur(i);
            }, i * 50); // Increment value every 10 milliseconds
          }
          const singleParagraphResponse = userResponse.replace(/\n/g, ' ').trim();
        axios.post(`${process.env.ENDPOINT}/ai/Vocal-Score`, { userResponse:singleParagraphResponse })
            .then(response => {
                console.log(response.data)
                setResults(response.data); // Assuming response.data contains the results you want to display
                setTestStarted(false); // Optionally reset testStarted if the test is concluded
            })
            .catch(error => {
                console.error('Error submitting response:', error);
                setLoadingResults(false); // Ensure loading state is reset on error
            });
            setLoadingResults(false)
    };

    return(
        <>
        {!testStarted && !loadingResults && !results && (
            <div className="text-center mt-4">
                <Button color="primary" onClick={startTest}>Start Test</Button>
            </div>
        )}
        {testStarted && !loadingResults && (
                question === '' ? (
                    <div className="text-center mt-4">
                        <Spinner color="primary" className='mb-2' />
                        <br />
                        <span>Loading text...</span>
                    </div>
                ) : !loadingResults &&(<>
                        <Card>
                        <CardBody>
                        <div className='d-flex justify-content-between mb-4'>
                            <h2 className="text-center ">Voice Test</h2>
                            <div className="timer mr-3">
                                <i className="ion ion-md-alarm mr-2" style={{fontSize:'25px', fontWeight:'bold'}}></i>
                                    <span style={timerStyle}>{formatTime()}</span>
                                </div>
                        </div>
                        <div className="mb-3">
                            <p style={{ fontSize: '14px' }}>{question}</p>
                        </div>
                        {!listening && (
                        <div className="text-center">
                            <Button color="primary" className="mt-2" onClick={startListeningToUser}>Start Speaking</Button>
                        </div>
                    )}
                    {listening && (
                        <div className="text-center">
                            <Button color="secondary" className="mt-2" onClick={stopListeningAndHandleSubmit}>Stop & Submit</Button>
                        </div>
                    )}
                    </CardBody>
                </Card>
                </>)
        )}
        </>
    )
}
export default connect(null, { setBreadcrumbItems })(VocalTest);
