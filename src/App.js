import React, { useState, useCallback, useMemo } from 'react';

// Componente principal de la aplicación
const App = () => {
    // Variables de estado para gestionar los datos y la interfaz de usuario de la aplicación
    const [selectedPillar, setSelectedPillar] = useState(''); // Almacena el pilar de contenido seleccionado actualmente
    const [generatedImage, setGeneratedImage] = useState(''); // Almacena la URL de la imagen generada
    const [generatedText, setGeneratedText] = useState(''); // Almacena el pie de foto de Instagram generado
    const [isLoading, setIsLoading] = useState(false); // Indica si el contenido se está generando actualmente
    const [error, setError] = useState(''); // Almacena cualquier mensaje de error
    const [telegramStatus, setTelegramStatus] = useState(''); // Mensaje de estado para el envío a Telegram

    // Define los pilares de contenido con sus IDs, nombres de visualización y prompts base para la generación de imágenes
    // Estos son los nuevos pilares y prompts enfocados en la relevancia del contenido.
    const contentPillars = useMemo(() => [
        { id: 'unboxing_thrill', name: 'La Emoción del Unboxing', prompt: 'A close-up, overhead shot of hands carefully opening a rustic, slightly worn cardboard box, revealing the corner of a unique, intriguing vintage item wrapped in tissue paper. Focus on the anticipation and the first glimpse of the discovery. Soft, natural lighting. Realistic photo.' },
        { id: 'curated_collections', name: 'Colecciones Curadas', prompt: 'An aesthetically pleasing flat lay of various unique, vintage, and quirky items (e.g., an old camera, a peculiar teacup, a retro clock, a small antique book) arranged artfully on a wooden table or a minimalist shelf. Focus on the texture and details of the collection. Soft, diffused lighting. Realistic photo.' },
        { id: 'before_after_transformation', name: 'Antes y Después: La Transformación', prompt: 'A split image showing a plain, uninspired corner of a room on one side, and the exact same corner on the other side, transformed and vibrant with the addition of a unique, eye-catching vintage furniture piece or decor item. Focus on the visual impact of the "find." Realistic photo.' },
        { id: 'story_behind_find', name: 'La Historia Detrás del Hallazgo', prompt: 'A close-up shot of a unique, antique item (e.g., an old compass, a vintage map, a weathered journal) resting on a textured surface, with subtle hints of its past like faded handwriting or a worn patina. Focus on the item\'s character and implied history. Soft, directional lighting. Realistic photo.' },
        { id: 'unexpected_gems', name: 'Gemas Inesperadas', prompt: 'An unusual, quirky, or surprisingly beautiful object (e.g., a vintage scientific instrument, an eccentric sculpture, a rare collectible toy) placed unexpectedly in a mundane setting, creating a sense of delightful discovery. Focus on the item\'s unique form and the contrast. Realistic photo.' },
        { id: 'gifting_joy', name: 'La Alegría de Regalar', prompt: 'A beautifully wrapped, unique gift package with a distinctive vintage or quirky item peeking out, being presented to hands reaching to receive it. Focus on the thoughtful presentation and the anticipation of a special, unexpected gift. Soft, warm lighting. Realistic photo.' },
        { id: 'crafty_transformation', name: 'La Transformación Creativa (DIY)', prompt: 'A close-up of hands actively engaged in a creative process, repurposing a unique vintage item (e.g., painting an old wooden crate, adding plants to a quirky ceramic pot, transforming a retro lamp). Focus on the hands and the item in mid-transformation, showing creativity and upcycling. Bright, well-lit workspace. Realistic photo.' },
        { id: 'vintage_vibes', name: 'Vibras Vintage', prompt: 'A stylishly composed scene featuring a prominent, iconic vintage item (e.g., a retro record player, a classic typewriter, a mid-century modern lamp) in a contemporary setting, creating a nostalgic yet chic aesthetic. Focus on the item\'s design and its timeless appeal. Warm, inviting lighting. Realistic photo.' },
    ], []);
    
    // La clave API se lee ahora de la variable global 'window' inyectada en index.html
    const apiKey = window.REACT_APP_GEMINI_API_KEY;

    // Función para manejar la generación de contenido (imagen y texto)
    const handleGenerateContent = useCallback(async (isRandom = false) => {
        setError('');
        setGeneratedImage('');
        setGeneratedText('');
        setTelegramStatus('');

        let pillarToGenerate = selectedPillar;
        if (isRandom) {
            const randomIndex = Math.floor(Math.random() * contentPillars.length);
            pillarToGenerate = contentPillars[randomIndex].id;
            setSelectedPillar(pillarToGenerate);
        }

        if (!pillarToGenerate) {
            setError('Please select a content pillar or generate random content.');
            return;
        }

        setIsLoading(true);

        try {
            const pillar = contentPillars.find(p => p.id === pillarToGenerate);
            if (!pillar) {
                throw new Error('Content pillar not found.');
            }

            // --- Paso 1: Generar Imagen usando Imagen 3.0 ---
            const imagePayload = {
                instances: { prompt: pillar.prompt },
                parameters: { "sampleCount": 1 }
            };
            const imageApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

            const imageResponse = await fetch(imageApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(imagePayload)
            });

            const imageResult = await imageResponse.json();

            let imageUrl = '';
            if (imageResult.predictions && imageResult.predictions.length > 0 && imageResult.predictions[0].bytesBase64Encoded) {
                imageUrl = `data:image/png;base64,${imageResult.predictions[0].bytesBase64Encoded}`;
                setGeneratedImage(imageUrl);
            } else {
                throw new Error('Failed to generate image. Please try again.');
            }

            // --- Paso 2: Generar pie de foto de texto usando Gemini 2.0 Flash ---
            // El prompt ahora pide el caption principal Y los hashtags separados por una nueva línea.
            const textPrompt = `Write an engaging Instagram caption in English for an image representing "${pillar.name}". The caption should encourage interaction and include relevant emojis. After the main caption, on a new line, provide 5-7 relevant hashtags for an account named @EbayCoolFinds, focusing on online shopping, unique finds, and the joy of discovery. The tone should be enthusiastic and friendly. Provide only the caption text, without any introductory phrases or comments.`;

            const textChatHistory = [{ role: "user", parts: [{ text: textPrompt }] }];
            const textPayload = { contents: textChatHistory };
            const textApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

            const textResponse = await fetch(textApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(textPayload)
            });

            const textResult = await textResponse.json();

            let generatedCaption = '';
            if (textResult.candidates && textResult.candidates.length > 0 && textResult.candidates[0].content && textResult.candidates[0].content.parts && textResult.candidates[0].content.parts.length > 0) {
                generatedCaption = textResult.candidates[0].content.parts[0].text;
                setGeneratedText(generatedCaption);
            } else {
                throw new Error('Failed to generate text. Please try again.');
            }

        } catch (err) {
            console.error("Error generating content:", err);
            setError(`Error: ${err.message || 'An unexpected error occurred.'}`);
        } finally {
            setIsLoading(false);
        }
    }, [selectedPillar, contentPillars, apiKey]);

    // Función para enviar contenido al Bot de Telegram a través de un Cloudflare Worker
    const sendToTelegram = useCallback(async () => {
        if (!generatedImage || !generatedText) {
            setTelegramStatus('Please generate content first.');
            return;
        }

        setTelegramStatus('Sending to Telegram...');
        const workerUrl = 'https://instagram-ecf-telegram-bot.opulentoebay.workers.dev'; 

        try {
            const response = await fetch(workerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_base64: generatedImage.split(',')[1],
                    caption: generatedText // Enviamos el caption completo al Worker
                })
            });

            const result = await response.json();

            if (response.ok) {
                setTelegramStatus('Content sent to Telegram successfully!');
            } else {
                setTelegramStatus(`Failed to send to Telegram: ${result.error || 'Unknown error'}`);
                console.error('Telegram Worker Error:', result);
            }
        } catch (err) {
            setTelegramStatus(`Error sending to Telegram: ${err.message}`);
            console.error('Network or Worker call error:', err);
        }
    }, [generatedImage, generatedText]);

    // Función para compartir contenido en otras redes sociales usando la Web Share API
    const shareOnSocialMedia = useCallback(() => {
        if (!generatedText) {
            alert('Please generate content first to share.');
            return;
        }

        if (navigator.share) {
            navigator.share({
                title: 'EbayCoolFinds Post',
                text: generatedText,
            }).then(() => {
                console.log('Content shared successfully');
            }).catch((error) => {
                console.error('Error sharing:', error);
                alert('Failed to share content. You might need to copy text and download image manually for some platforms.');
            });
        } else {
            alert('Your browser does not support direct sharing. Please copy the text and download the image manually to share on social media.');
        }
    }, [generatedText]);

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-inter">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-2xl flex flex-col items-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Content Generator for @EbayCoolFinds</h1>
                <p className="text-gray-600 text-center mb-8">
                    Select a content pillar or generate random content for an image and an Instagram caption.
                </p>

                <div className="w-full mb-6">
                    <label htmlFor="pillar-select" className="block text-gray-700 text-sm font-semibold mb-2">
                        Select a Content Pillar:
                    </label>
                    <div className="relative">
                        <select
                            id="pillar-select"
                            className="block appearance-none w-full bg-gray-50 border border-gray-300 text-gray-700 py-3 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-blue-500 transition duration-200 ease-in-out"
                            value={selectedPillar}
                            onChange={(e) => setSelectedPillar(e.target.value)}
                            disabled={isLoading}
                        >
                            <option value="">-- Choose a pillar --</option>
                            {contentPillars.map((pillar) => (
                                <option key={pillar.id} value={pillar.id}>
                                    {pillar.name}
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row w-full gap-4 mb-6">
                    <button
                        onClick={() => handleGenerateContent(false)}
                        className={`flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${isLoading || !selectedPillar ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={isLoading || !selectedPillar}
                    >
                        {isLoading && !selectedPillar ? (
                            <div className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                                Generating...
                            </div>
                        ) : (
                            'Generate Selected Content'
                        )}
                    </button>
                    <button
                        onClick={() => handleGenerateContent(true)}
                        className={`flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading && selectedPillar === '' ? (
                            <div className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                                Generating Random...
                            </div>
                        ) : (
                            'Generate Random Content'
                        )}
                    </button>
                </div>


                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mt-6 w-full" role="alert">
                        <strong className="font-bold">Error!</strong>
                        <span className="block sm:inline"> {error}</span>
                    </div>
                )}

                {(generatedImage || generatedText) && (
                    <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-xl w-full">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">Generated Content:</h2>

                        {generatedImage && (
                            <div className="mb-6 flex flex-col items-center">
                                <h3 className="text-xl font-medium text-gray-700 mb-2">Image:</h3>
                                <div className="relative">
                                    <img
                                        src={generatedImage}
                                        alt="Generated Instagram Content"
                                        className="w-full h-auto rounded-lg shadow-md max-w-md mx-auto block"
                                    />
                                    <img
                                        src="/ebay-cool-finds-logo.png"
                                        alt="EbayCoolFinds Logo Profile"
                                        className="absolute bottom-2 right-2 w-16 h-16 object-contain rounded-full border-2 border-white shadow-lg"
                                        onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/64x64/cccccc/ffffff?text=Logo"; }}
                                    />
                                </div>
                                <p className="text-sm text-gray-500 mt-2 text-center">
                                    *Remember to add your logo as a watermark to this image using an external tool before publishing.
                                </p>
                                <a
                                    href={generatedImage}
                                    download="EbayCoolFinds_Image.png"
                                    className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
                                >
                                    Download Image
                                </a>
                            </div>
                        )}

                        {generatedText && (
                            <div>
                                <h3 className="text-xl font-medium text-gray-700 mb-2">Instagram Caption:</h3>
                                <div className="bg-white p-4 rounded-lg border border-gray-300 text-gray-800 whitespace-pre-wrap break-words">
                                    {generatedText}
                                </div>
                                <button
                                    onClick={sendToTelegram}
                                    className={`mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 ${!generatedImage || !generatedText ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={!generatedImage || !generatedText}
                                >
                                    Send to Telegram Bot (InstagramECF)
                                </button>
                                {telegramStatus && <p className="text-sm text-center mt-2">{telegramStatus}</p>}

                                <button
                                    onClick={shareOnSocialMedia}
                                    className={`mt-4 w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-opacity-50 ${!generatedText ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={!generatedText}
                                >
                                    Share on Social Media
                                </button>
                                <p className="text-sm text-gray-500 mt-2 text-center">
                                    *For sharing with image on some platforms, you may need to download the image and upload it to a public hosting service first.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
