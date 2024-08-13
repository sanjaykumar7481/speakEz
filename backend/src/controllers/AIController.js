const axios = require('axios');
const FormData = require('form-data');
const  { GoogleGenerativeAI } =require("@google/generative-ai");
const { use } = require('../routes/AIServicesRoute');
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
        // console.log(document_id);
        // const document_id='f4fb94ea183643d79c31f534d60d1c4b';
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
            // console.log(result)
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
        
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        
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
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        const prompt = `You are the interviewer for the ${JobRole} position. Your task is to conduct a mock interview with ${ApplicantName} based on the skills - (${JobSkills}). Generate interview questions that require brief, conceptual answers. Please avoid questions that require code implementation. Provide only 5 questions in total.Make it more realistic by using his name which is ${ApplicantName}}in the questions.`;

        async function run() {
            
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });

            // Generate content based on the prompt
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            // console.log(text);

            // Send the generated questions in the response
            res.status(200).send({ msg: text });
        }

        run();
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('Internal Server Error');
    }
}
const checkSpelling = async (text, subscriptionKey) => {
    const apiUrl = 'https://api.bing.microsoft.com/v7.0/spellcheck';
    const headers = {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'application/x-www-form-urlencoded'
    };
    const params = new URLSearchParams();
    params.append('text', text);
    try {
        const response = await axios.post(apiUrl, params, { headers });
        if (response.status === 200) {
            const data = response.data;
            // console.log(data)
            if (data.flaggedTokens && data.flaggedTokens.length > 0) {
                const misspelledWords = data.flaggedTokens.map(token => ({
                    word: token.token,
                    suggested: token.suggestions ? token.suggestions[0].suggestion : null
                }));
                return misspelledWords;
            }
        }
        return [];
    } catch (error) {
        console.error('Error checking spelling:', error);
        return [];
    }
};
const EnglishScore=async(req,res)=>{
    const {userResponse}  = req.body;
    const documents=[];
    documents.push(userResponse);
    let summary=[];
    // Replace 'Your-Bing-Spell-Check-Subscription-Key' with your actual Bing Spell Check subscription key
    const subscriptionKey = process.env.BING_SPELL_CHECK_API_KEY;
    const client_spell = new language.LanguageServiceClient();
        const document = {
        content: userResponse,
        type: 'PLAIN_TEXT',
        };

        // Need to specify an encodingType to receive word offsets
        const encodingType = 'UTF8';
    // Check spelling in the text
    try{
    const misspelledWords = await checkSpelling(userResponse, subscriptionKey);
    // const summaries = await extractiveSummarization(documents);
    // const keyPhrases = await extractKeyPhrases(documents);
    const client = new TextAnalysisClient(azureEndpoint, new AzureKeyCredential(azureKey));
  const actions = [
    {
      kind: "ExtractiveSummarization",
      maxSentenceCount: 2,
    },
  ];
  const poller = await client.beginAnalyzeBatch(actions, documents, "en");

  poller.onProgress(() => {
    
  });

  const results = await poller.pollUntilDone();

  for await (const actionResult of results) {
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
        const [syntax] = await client_spell.analyzeSyntax({document, encodingType});
        const partsOfSpeech={'ADJ':[],'NOUN':[],'VERB':[],'ADV':[]}
        
        syntax.tokens.forEach(part => {
        // if(part.partOfSpeech.mood!='MOOD_UNKNOWN'){
            // console.log(part.text);
            const ppspeech=part.partOfSpeech.tag;

            if(ppspeech=='ADJ' || ppspeech=='NOUN' || ppspeech=='ADV' || ppspeech=='VERB')
            {
            partsOfSpeech[ppspeech].push(part.text.content)    
            }  
        });  
        res.status(200).send({ misspelledWords,partsOfSpeech,summary});

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
        
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        
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
module.exports = {
    uploadDocument,
    Getquestions,
    WETQuestion,
    EnglishScore,
    RandomText
};
