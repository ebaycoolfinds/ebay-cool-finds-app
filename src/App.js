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
    // Estos son los nuevos pilares y prompts enfocados en la cultura eBay y la relevancia del contenido.
    const contentPillars = useMemo(() => [
        { id: 'freshly_arrived_treasure', name: 'El Tesoro Recién Llegado', prompt: 'A close-up, overhead shot of hands carefully opening a branded, slightly worn cardboard shipping box (with subtle "eBay" or generic shipping labels), revealing a corner of a unique, vintage, or quirky item wrapped in protective material. Focus on the item\'s first reveal and the texture of the packaging. Soft, natural light. Realistic photo.' },
        { id: 'ebay_hidden_gems', name: 'Joyas Ocultas de eBay', prompt: 'A dramatic close-up of a rare, intricate, or surprisingly valuable vintage item (e.g., an antique watch, a unique piece of jewelry, a rare coin) subtly lit to highlight its details, resting on a velvet cloth or a simple, elegant surface. Focus on the item\'s craftsmanship and rarity. Dark, moody lighting. Realistic photo.' },
        { id: 'vintage_charm', name: 'El Encanto Vintage', prompt: 'A stylish flat lay of several beautifully preserved vintage items (e.g., retro camera, classic vinyl record, antique book, mid-century modern ceramic vase) artfully arranged on a rustic wooden surface or a clean, minimalist background. Focus on the nostalgic aesthetic and timeless design. Bright, airy lighting. Realistic photo.' },
        { id: 'the_deal_hunt', name: 'La Caza de Ofertas', prompt: 'A close-up of a smartphone screen displaying an eBay "Sold" listing with a significantly discounted price, with a hand holding the phone and a blurred background of a cozy home setting. Focus on the "deal" aspect and the feeling of a successful bargain hunt. Soft, warm lighting. Realistic photo.' },
        { id: 'art_of_packaging', name: 'El Arte del Empaque', prompt: 'An artistic close-up of a neatly packaged eBay item, partially wrapped in bubble wrap or custom tissue paper, with a glimpse of the item inside. Focus on the texture of the packaging materials and the anticipation of unwrapping. Soft, diffused studio lighting. Realistic photo.' },
        { id: 'unexpected_curiosities', name: 'Curiosidades Inesperadas', prompt: 'A whimsical and slightly surreal close-up of an androgynous mannequin head wearing a quirky, unique vintage hat or accessory found on eBay, placed on a simple, contrasting background. Focus on its oddity and conversation-starting nature. Creative, playful lighting. Realistic photo.' },
        { id: 'the_collectors_corner', name: 'El Rincón del Coleccionista', prompt: 'A cozy, well-organized corner of a room showcasing a dedicated collection of eBay finds (e.g., rows of vintage action figures, neatly arranged antique books, a display of unique ceramic plates). Focus on the passion of collecting and the curated display. Warm, inviting home lighting. Realistic photo.' },
        { id: 'reviving_the_past', name: 'Reviviendo el Pasado', prompt: 'A close-up of an old, weathered, but still functional vintage item (e.g., an antique camera, a retro radio, a classic board game) being used or interacted with in a modern setting. Focus on the blend of old and new, and the item\'s enduring appeal. Soft, nostalgic lighting. Realistic photo.' },
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
                    Select a content pillar or generate random content.
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