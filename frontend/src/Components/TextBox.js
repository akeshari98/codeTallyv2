import React, { useEffect, useState } from 'react';
import { useRef } from 'react';
import axios from 'axios';
import '../App.css'
import CodeMirror from '@uiw/react-codemirror';
import { StreamLanguage } from '@codemirror/language';
import { cpp } from '@codemirror/lang-cpp';

// Replace with the URL you want to send the request to
const apiUrl = `http://localhost:6909/test`; // cpp compilation docker container 
const submitUrl = `http://localhost:6909/submit`;
const defaultText = "#include <bits/stdc++.h>\nusing namespace std;\n\nint main(){\n int t;\n cin >> t;\n while(t--){\n\n }\n}";

export default function TextBox({ socketRef, currentProbId }) {
    console.log('I am textbox and the current problem id is ' + currentProbId);
    const [textvalue, setTextvalue] = useState(defaultText);
    const [inputvalue, setInputvalue] = useState('');
    const [outputvalue, setOutputvalue] = useState('');
    const [outputMessage, setOutputMessage] = useState('');
    const [verdict, setVerdict] = useState('');
    const [color, setColor] = useState('black');

    function SocketEmit(channel, msg) {
        if (socketRef.current) {
            socketRef.current.emit(channel, { code: msg });
        }
    }

    useEffect(() => {
        if (socketRef.current) {
            socketRef.current.on('receive-code-update', (payload) => {
                setTextvalue(payload.code);
            });
        }
    }, [socketRef.current]);


    useEffect(() => {
        console.log(`outputvalue changed to ${outputvalue}`);
        // outputvalue = outputvalue.trim();
        if (outputvalue === "Submitting.." || outputvalue === "") {
            setColor('black');
        }
        else {
            setColor(outputvalue.trim() === "Accepted" ? 'green' : 'red');
        }
    }, [outputvalue]);


    const Handlechange = React.useCallback((val, viewUpdate) => {
        setTextvalue(val);
        SocketEmit('update-code', val);
    }, []);

    function Handlechangeinput(e) {
        setInputvalue(e.target.value);
        const newval = e.target.value;
        SocketEmit('update-input', newval);
    }
    ///here the response.data = {message,output};
    /// message = AC TLE etc, output: Output.

    async function sendcompilereq() {
        setOutputvalue("Submitting..");
        try {
            const requestData = {
                code: textvalue,
                input: inputvalue
            };
            const response = await axios.post(apiUrl, requestData);
            // Check if the response contains a `message` or `error`
            console.log("db!")

            if (response.data.message) {
                // console.log(response.data);
                if (response.data.output) {
                    setOutputvalue(response.data.output);
                }
                setOutputMessage(response.data.message);
            } else if (response.data.error) {
                setOutputvalue(response.data.error);
                if (response.data.output) {
                    setOutputvalue(response.data.output);
                }
            } else {
                setOutputvalue("Unexpected response format");
            }
        } catch (error) {
            // Check if the error response contains `message`
            if (error.response && error.response.data && error.response.data.error) {
                setOutputvalue(error.response.data.error);
            } else {
                setOutputvalue("An error occurred: " + error.message);
            }
        }
    }

    async function sendsubmitreq() {
        setOutputvalue("Submitting..");
        try {
            const requestData = {
                code: textvalue,
                problem_id: currentProbId
            };
            const response = await axios.post(submitUrl, requestData);
            setOutputvalue(response.data.message);
        }
        catch (error) {
            setOutputvalue(error.message);
        }
    }

    function Handlecompile(e) {
        sendcompilereq();
    }

    function Handlesubmit(e) {
        const res = sendsubmitreq();
        // setVerdict(res);
        console.log(res);
    }


    return (
        <div className="RHS">
            <div className="code-area">
                <CodeMirror value={textvalue} width='170vh' height="86vh" onChange={Handlechange} extensions={[cpp()]} />
            </div>
            <div className="input-output">
                <div className="input-area">
                    <textarea
                        style={{ height: '5vh', resize: "none" }}
                        id="input"
                        value={inputvalue}
                        onChange={Handlechangeinput}
                        placeholder="Enter input here"
                    ></textarea>
                </div>
                <div className="output-area" style={{ padding: '1px', width: '100%', height: '6vh', border: '2px solid black', color: color }}>
                    Output: {outputvalue}
                </div>
                <div className="output-area" style={{ padding: '1px', width: '100%', height: '6vh', border: '2px solid black', color: color }}>
                    Message: {outputMessage}
                </div>
                {/* <div> Output Value: {outputvalue}</div> */}
            </div>
            <div>
                <button onClick={Handlecompile}>Compile</button>
                <button onClick={Handlesubmit}>Submit</button>
                {/* <div>{verdict}</div> */}
            </div>
        </div>
    )
}
