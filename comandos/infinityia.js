const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require('../config.json');
const apiKey = config.api;

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const generationConfig = {
    temperature: 1,
    topP: 1,
    topK: 40,
    maxOutputTokens: 1500,
    responseMimeType: "text/plain",
};

const getFormattedDateTime = () => {
    const now = new Date();
    const optionsData = { timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", year: "numeric" };
    const optionsHora = { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", second: "2-digit" };
    
    const horarioDeBrasilia = new Intl.DateTimeFormat("pt-BR", optionsHora).format(now);
    const diaBrasileiro = new Intl.DateTimeFormat("pt-BR", optionsData).format(now);
    
    return { horarioDeBrasilia, diaBrasileiro };
};

async function generateResponse(userInput) {
    try {
        const { horarioDeBrasilia, diaBrasileiro } = getFormattedDateTime();
        
        const parts = [
            { text: "input: que horas são?" },
            { text: `output: ${horarioDeBrasilia}` },
            { text: "input: que dia é hoje?" },
            { text: `output: ${diaBrasileiro}` },
            { text: "input: quem é seu criador?" },
            { text: "output: Fui Criado Por <@1249447136047792272>" },
            { text: "input: voce foi criado pelo google?" },
            { text: "output: Não. Fui Desenvolvido Por <@1249447136047792272>" },
            { text: "input: voce é o gemini?" },
            { text: "output: Não. Fui Desenvolvido Por <@1249447136047792272>" },
            { text: "input: voce é o chatgpt?" },
            { text: "output: Não. Fui Desenvolvido Por <@1249447136047792272>" },
            { text: `input: ${userInput}` },
            { text: "output:" }
        ];

        const result = await model.generateContent({
            contents: [{ role: "user", parts }],
            generationConfig,
        });

        return result.response.text().trim() || "Desculpe, não consegui gerar uma resposta."; 
    } catch (error) {
        console.error("Erro IA:", error);
        return "Desculpe, não consegui gerar uma resposta."; 
    }
}

function formatarRespostaParaDiscord(texto) {
    // Usando regex para formatação no Discord de maneira mais precisa
    return texto
        .replace(/\*\*(.*?)\*\*/g, '**$1**')
        .replace(/\*(.*?)\*/g, '*$1*')
        .replace(/\. /g, '.\n');
}

async function handleAIResponse(message, prompt) {
    try {
        const loadingMessage = await message.channel.send("# Carregando Resposta...");

        let respostaIA = await generateResponse(prompt); 

        if (respostaIA.length > 2000) {
            console.log("[IA] Excedeu 2000 caracteres.");
            respostaIA = await generateResponse(`Resuma o seguinte texto para 1850 caracteres:\n${respostaIA}`);
        }

        let respostaFormatada = formatarRespostaParaDiscord(respostaIA);
        let respostaFinal = respostaFormatada.replace(/google/gi, 'infinitydevl');
        respostaFinal += `\n\n-# ©️ Copyright: <@1249447136047792272>.`;

        await loadingMessage.edit(respostaFinal);
        setTimeout(() => loadingMessage.delete().catch(() => {}), 50000);  
    } catch (error) {
        console.error("Erro resposta:", error.message);
        message.channel.send('Erro com a IA. Tente novamente.').catch(() => {});
    }
}

module.exports = {
    name: "ia",
    description: "Converse com a IA do Gemini.",
    run: async (client, message, args) => {
        if (!message.channel) {
            console.error('Canal não encontrado!');
            return;
        }

        const canalPermitido = '849718729183854672'; 

        if (message.guild && message.guild.id === '680183137455833119') {
            if (message.channel.id !== canalPermitido) return; 
        }

        if (!args.length) return message.channel.send('Use: !ia (sua mensagem)');

        let mensagemUsuario = args.join(' ').trim();
        mensagemUsuario = mensagemUsuario.replace(/^ia\s*/i, '').trim();

        if (!mensagemUsuario) return message.channel.send('Envia algo mais.');

        await handleAIResponse(message, mensagemUsuario);
    }
};
