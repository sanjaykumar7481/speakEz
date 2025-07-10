const axios = require('axios');
const SymSpell = require("node-symspell");
const FormData = require('form-data');
const  { GoogleGenerativeAI } =require("@google/generative-ai");
const { use } = require('../routes/AIServicesRoute');
const { spawn } =require('child_process')
const language=require('@google-cloud/language')
const { AzureKeyCredential, TextAnalysisClient } = require("@azure/ai-language-text");

const azureEndpoint = process.env.AZURE_TEXT_ANALYTICS_ENDPOINT; // Your Text Analytics endpoint
const azureKey = process.env.AZURE_TEXT_ANALYTICS_API_KEY;
const client = new TextAnalysisClient(azureEndpoint, new AzureKeyCredential(azureKey));
const uploadDocument = async (req, res) => {
    const id = process.env.PARSEUR_ID; // Replace with your actual ID
    const parseurApiKey = process.env.PARSEUR_API_KEY;
    const parseurApiEndpoint = process.env.PARSEUR_API_ENDPOINT;
    
    try {
        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });

        const response1 = await axios.post(parseurApiEndpoint + `/parser/${id}/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                Authorization: parseurApiKey
            }
        });

        const document_id = response1.data.attachments[0].DocumentID;
        console.log(document_id);
        // console.log(document_id);
        //const document_id='97760114';
        let result = null;
        const maxAttempts = 20;
        let attempts = 0;

        while (attempts < maxAttempts) {
            const response2 = await axios.get(parseurApiEndpoint + `/document/${document_id}`, {
                headers: {
                    Authorization: parseurApiKey
                }
            });

            if (response2.data.result !== null) {
                result = response2.data.result;
                break;
            }

            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        // console.log(result)
        if (result !== null) {
            console.log(result)
            res.status(200).send(result);
        } else {
            res.status(500).send('Document processing timed out');
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
};
const WETQuestion=async(req,res)=>{
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const prompt = `Generate a single open-ended question for a Written English Test (WET) that evaluates candidates' creativity and attitude. just give me the question without any further information `;
    try{
    async function run() {
        
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
    //    console.log(text)
        res.status(200).send({ question: text });
    }

    run();
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('Internal Server Error');
    }
}

const Getquestions=async(req,res)=>{
    try {
        const { JobSkills, JobRole, ApplicantName } = req.body;
        //const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        console.log(JobSkills,JobRole,ApplicantName)
        //console.log(JobSkills);
        const prompt = `You are the interviewer for the ${JobRole} position. Your task is to conduct a mock interview with ${ApplicantName} based on the skills - (${JobSkills}). Generate interview questions that require brief, conceptual answers. Please avoid questions that require code implementation. Provide only 5 questions in total.Make it more realistic by using his name which is ${ApplicantName}}in the questions. Do not include any extra text except questions. give them in form of array`;
        //console.log(prompt);
        async function run() {
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
                {
                    contents: [
                        {
                            parts: [{ text: prompt }]
                        }
                    ]
                },
                {
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
            
            // const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            // // Generate content based on the prompt
            // const result = await model.generateContent(prompt);
            // const response = await result.response;
            // const text = response.text();
            const questions = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
            console.log(questions);

            // Send the generated questions in the response
            res.status(200).send({ msg: questions });
        }

        run();
    } catch (error) {
        console.log("gemini api error");
        console.error('Error:', error.message);
        res.status(500).send('Internal Server Error');
    }
}
// const checkSpelling = async (text, subscriptionKey) => {
//     const apiUrl = 'https://spellcheckk.cognitiveservices.azure.com/bing/v7.0/SpellCheck';
//     const headers = {
//         'Ocp-Apim-Subscription-Key': 'DMA3gqVc5wHuaBWSM3dTauFrlh7ELc9P3kRF60n3oI35JLh9f5cMJQQJ99BCACYeBjFXJ3w3AAAEACOGmFP1',
//         'Content-Type': 'application/x-www-form-urlencoded'
//     };
//     const params = new URLSearchParams();
//     params.append('text', text);
//     try {
//         const response = await axios.post(apiUrl, params, { headers });
//         if (response.status === 200) {
//             const data = response.data;
//             // console.log(data)
//             if (data.flaggedTokens && data.flaggedTokens.length > 0) {
//                 const misspelledWords = data.flaggedTokens.map(token => ({
//                     word: token.token,
//                     suggested: token.suggestions ? token.suggestions[0].suggestion : null
//                 }));
//                 console.log(misspelledWords);
//                 return misspelledWords;
//             }
//         }
//         return [];
//     } catch (error) {
//         console.error('Error checking spelling:', error);
//         return [];
//     }
// };
const checkSpelling = async (sentence) => {

    //console.log();
    try{
            const symSpell = new SymSpell();
        await symSpell.loadDictionary("frequency_dictionary_en_82_765.txt", 0, 1);
        
        const words = sentence.replace(/[^a-zA-Z\s]/g, "").split(/\s+/);
        let corrections = [];

        for (const word of words) {
            const suggestions = symSpell.lookup(word, 2);
            if (suggestions.length > 0 && suggestions[0].term.toLowerCase() !== word.toLowerCase()) {
                corrections.push({ word: word, suggested: suggestions[0].term });
            }
        }
        console.log(corrections);
        return corrections;
    }
    catch(err){
        console.log("error in check spelling ",err);
    }
};
const EnglishScore=async(req,res)=>{
    const {userResponse}  = req.body;
    const documents=[];
    documents.push(userResponse);
    let summary=[];
    try{
//     // Replace 'Your-Bing-Spell-Check-Subscription-Key' with your actual Bing Spell Check subscription key
//     const subscriptionKey = process.env.BING_SPELL_CHECK_API_KEY;
//     const client_spell = new language.LanguageServiceClient();
//         const document = {
//         content: userResponse,
//         type: 'PLAIN_TEXT',
//         };

//         // Need to specify an encodingType to receive word offsets
//         const encodingType = 'UTF8';
//     // Check spelling in the text
//     try{
//     const misspelledWords = await checkSpelling(userResponse);
//     // const summaries = await extractiveSummarization(documents);
//     // const keyPhrases = await extractKeyPhrases(documents);
    //     const client = new TextAnalysisClient(azureEndpoint, new AzureKeyCredential(azureKey));
    const actions = [
        {
        kind: "ExtractiveSummarization",
        maxSentenceCount: 10,
        },
    ];
    const poller = await client.beginAnalyzeBatch(actions, documents, "en");

    poller.onProgress(() => {
        
    });

    const results = await poller.pollUntilDone();

     for await (const actionResult of results) {
        //console.log(actionResult);
        if (actionResult.kind !== "ExtractiveSummarization") {
        console.error(`Expected extractive summarization results but got: ${actionResult.kind}`);
        }
        if (actionResult.error) {
        const { code, message } = actionResult.error;
        console.error(`Unexpected error (${code}): ${message}`);
        }
        for (const result of actionResult.results) {
        //   console.log(`- Document ${result.id}`);
        if (result.error) {
            const { code, message } = result.error;
            console.error(`Unexpected error (${code}): ${message}`);
        }
        //   console.log("Summary:");
        result.sentences.map((sentence) => summary.push(sentence.text))
        }
        }
        console.log(summary);
        const misspelledWords = await checkSpelling(userResponse);
        // const [syntax] = await client_spell.analyzeSyntax({document, encodingType});
        const partsOfSpeech={'ADJ':[],'NOUN':[],'VERB':[],'ADV':[]}
        
        // syntax.tokens.forEach(part => {
        // // if(part.partOfSpeech.mood!='MOOD_UNKNOWN'){
        //     // console.log(part.text);
        //     const ppspeech=part.partOfSpeech.tag;

        //     if(ppspeech=='ADJ' || ppspeech=='NOUN' || ppspeech=='ADV' || ppspeech=='VERB')
        //     {
        //     partsOfSpeech[ppspeech].push(part.text.content)    
        //     }  
        // partsOfSpeech,summary
        // });  
        res.status(200).send({misspelledWords,summary});

        // }
        }
        catch(error){
            console.error('Error calling Azure Text Analytics API:', error);
        res.status(500).json({ error: error });
        }
        
        
}
const RandomText=async(req,res)=>{
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const prompt = `Provide  descriptive text suitable for practicing English fluency and accent, focusing on the theme of adventure. so that a person takes 3 minutes to read it.`;
    try{
    async function run() {
        
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
       
        res.status(200).send({ Random_Text: text });
    }

    run();
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('Internal Server Error');
    }
}
const VocalScore = async (req, res) => {
    try {
        const { actualText, transcribedText } = req.body;

        // Validate inputs
        if (!actualText || !transcribedText) {
            return res.status(400).json({ message: 'Both actual text and transcribed text are required.' });
        }

        // Calculate accuracy score and get other details
        const { accuracy, lcsLength, matchedWords, mismatchedWords, matchedCount, mismatchedCount } = await evaluateAccuracyScore(actualText, transcribedText);

        // Return the score and additional details
        res.json({
            accuracy,
            lcsLength,
            matchedWords,
            mismatchedWords,
            matchedCount, // Include matched count
            mismatchedCount // Include mismatched count
        });
    } catch (error) {
        console.error('Error processing vocal score:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
}
const evaluateAccuracyScore = async (actualText, transcribedText) => {
    const actualWords = actualText.split(/\s+/);
    const transcribedWords = transcribedText.split(/\s+/);

    const m = actualWords.length;
    const n = transcribedWords.length;

    // Initialize LCS DP table
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    // Fill DP table
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (actualWords[i - 1].toLowerCase() === transcribedWords[j - 1].toLowerCase()) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    // LCS length is found in dp[m][n]
    const lcsLength = dp[m][n];

    // Determine matched and mismatched words
    const matchedWords = [];
    const mismatchedWords = [];

    // Backtrack to find the LCS words
    let i = m, j = n;
    while (i > 0 && j > 0) {
        if (actualWords[i - 1].toLowerCase() === transcribedWords[j - 1].toLowerCase()) {
            matchedWords.push(actualWords[i - 1]); // Push matched word
            i--;
            j--;
        } else if (dp[i - 1][j] >= dp[i][j - 1]) {
            i--;
        } else {
            j--;
        }
    }
    matchedWords.reverse(); // Reverse to maintain original order

    // Create a Set for easier mismatched words calculation
    const matchedSet = new Set(matchedWords.map(word => word.toLowerCase()));

    for (let word of actualWords) {
        if (!matchedSet.has(word.toLowerCase())) {
            mismatchedWords.push(word); // Identify mismatched words
        }
    }

    // Calculate accuracy based on LCS length
    let accuracy = (lcsLength / m) * 100;
    const matchedCount = matchedWords.length;
    const mismatchedCount = mismatchedWords.length;
    accuracy = accuracy.toFixed(2);

    return {
        matchedWords,
        mismatchedWords,
        matchedCount,
        mismatchedCount,
        accuracy
    };
};
module.exports = {
    uploadDocument,
    Getquestions,
    WETQuestion,
    EnglishScore,
    RandomText,
    VocalScore,
    evaluateAccuracyScore
};
