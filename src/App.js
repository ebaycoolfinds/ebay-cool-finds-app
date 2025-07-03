import React, { useState, useCallback, useMemo } from 'react'; // Asegúrate de que useMemo esté importado aquí

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
    // Este array se envuelve en useMemo para evitar que se recree en cada renderizado,
    // lo que causaba el error de ESLint/build en Cloudflare Pages.
    const contentPillars = useMemo(() => [
        { id: 'discovery', name: 'The Thrill of Discovery', prompt: 'A person experiencing surprise and wonder, looking at something amazing just out of frame, with a bright, curious expression. Focus on the emotion of discovery and a sense of awe. Realistic photo.' },
        { id: 'lifestyle', name: 'The Online Treasure Hunter Lifestyle', prompt: 'A person with a thoughtful and satisfied expression, holding a unique, non-descript vintage item. The setting suggests a cozy, curated space, like a home office or a reading nook. Focus on the lifestyle and joy of finding unique items. Realistic photo.' },
        { id: 'community', name: 'The Smart Shopper Community', prompt: 'Two or three diverse people happily interacting around a tablet or smartphone, sharing a moment of excitement over an online find. They are smiling and engaged. Focus on connection and shared joy. Realistic photo.' },
        { id: 'inspiration', name: 'Inspiration and Creativity', prompt: 'Hands arranging abstract, colorful elements or non-descript unique objects in a creative way on a clean surface, suggesting new ideas and possibilities for home decor or hobbies. Focus on creativity and arrangement. Realistic photo.' },
        { id: 'transformation', name: 'The Transformation Potential', prompt: 'A split image or a subtle transition showing a dull, uninspired space on one side and the same space looking vibrant and personalized on the other, implying a "cool find" made the difference. Focus on transformation and aesthetic improvement. Realistic photo.' },
        { id: 'gifting', name: 'The Joy of Gifting', prompt: 'Hands exchanging a beautifully wrapped, non-descript gift package, with both people smiling warmly. Focus on the happiness of giving and receiving a special item. Realistic photo.' },
        { id: 'aha_moment', name: 'The "Aha!" Moment', prompt: 'A person with a sudden look of inspiration, a lightbulb moment, while browsing on a tablet or computer. Focus on the spark of an idea or solution found online. Realistic photo.' },
        { id: 'sustainable_finds', name: 'Sustainable Finds', prompt: 'Hands carefully examining a pre-loved, unique item, with a soft, appreciative touch. The background suggests a conscious, eco-friendly lifestyle. Focus on sustainability and finding new life for items. Realistic photo.' },
    ], []); // El array vacío [] como dependencia asegura que este array se memorice una vez.
    
    // La clave API se lee ahora de la variable global 'window' inyectada en index.html
    const apiKey = window.REACT_APP_GEMINI_API_KEY;

    // Función para manejar la generación de contenido (imagen y texto)
    // El parámetro isRandom determina si se debe seleccionar un pilar aleatorio.
    const handleGenerateContent = useCallback(async (isRandom = false) => {
        setError(''); // Limpia errores anteriores
        setGeneratedImage(''); // Limpia imagen anterior
        setGeneratedText(''); // Limpia texto anterior
        setTelegramStatus(''); // Limpia estado anterior de Telegram

        let pillarToGenerate = selectedPillar;
        if (isRandom) {
            // Selecciona un pilar aleatorio si se hizo clic en el botón aleatorio
            const randomIndex = Math.floor(Math.random() * contentPillars.length);
            pillarToGenerate = contentPillars[randomIndex].id;
            setSelectedPillar(pillarToGenerate); // Actualiza el menú desplegable para mostrar el pilar aleatorio seleccionado
        }

        if (!pillarToGenerate) {
            setError('Please select a content pillar or generate random content.');
            return;
        }

        setIsLoading(true); // Establece el estado de carga a verdadero

        try {
            // Encuentra los datos del pilar seleccionado
            const pillar = contentPillars.find(p => p.id === pillarToGenerate);
            if (!pillar) {
                throw new Error('Content pillar not found.');
            }

            // --- Paso 1: Generar Imagen usando Imagen 3.0 ---
            // Payload para la llamada a la API de generación de imágenes
            const imagePayload = {
                instances: { prompt: pillar.prompt }, // Usa el prompt del pilar para la generación de imágenes
                parameters: { "sampleCount": 1 } // Asegura que solo se genere una imagen
            };
            // URL de la API para Imagen 3.0
            const imageApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

            // Solicitud fetch a la API de generación de imágenes
            const imageResponse = await fetch(imageApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(imagePayload)
            });

            const imageResult = await imageResponse.json();

            let imageUrl = '';
            // Verifica si la generación de imágenes fue exitosa y extrae los datos de la imagen en base64
            if (imageResult.predictions && imageResult.predictions.length > 0 && imageResult.predictions[0].bytesBase64Encoded) {
                imageUrl = `data:image/png;base64,${imageResult.predictions[0].bytesBase64Encoded}`;
                setGeneratedImage(imageUrl); // Actualiza el estado con la URL de la imagen generada
            } else {
                throw new Error('Failed to generate image. Please try again.');
            }

            // --- Paso 2: Generar pie de foto de texto usando Gemini 2.0 Flash ---
            // Construye un prompt detallado para la generación de texto basado en el nombre del pilar
            // El prompt pide explícitamente solo el texto del pie de foto sin frases introductorias.
            const textPrompt = `Write an engaging Instagram caption in English for an image representing "${pillar.name}". The caption should encourage interaction and include 5-7 relevant hashtags for an account named @EbayCoolFinds, focusing on online shopping, unique finds, and the joy of discovery. The tone should be enthusiastic and friendly. Provide only the caption text, without any introductory phrases or comments.`;

            const textChatHistory = [{ role: "user", parts: [{ text: textPrompt }] }];
            const textPayload = { contents: textChatHistory };
            // URL de la API para Gemini 2.0 Flash
            const textApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

            // Solicitud fetch a la API de generación de texto
            const textResponse = await fetch(textApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(textPayload)
            });

            const textResult = await textResponse.json();

            let generatedCaption = '';
            // Verifica si la generación de texto fue exitosa y extrae el texto
            if (textResult.candidates && textResult.candidates.length > 0 && textResult.candidates[0].content && textResult.candidates[0].content.parts && textResult.candidates[0].content.parts.length > 0) {
                generatedCaption = textResult.candidates[0].content.parts[0].text;
                setGeneratedText(generatedCaption); // Actualiza el estado con el texto generado
            } else {
                throw new Error('Failed to generate text. Please try again.');
            }

        } catch (err) {
            console.error("Error generating content:", err);
            setError(`Error: ${err.message || 'An unexpected error occurred.'}`);
        } finally {
            setIsLoading(false); // Restablece el estado de carga
        }
    }, [selectedPillar, contentPillars, apiKey]); // Dependencias para useCallback

    // Función para enviar contenido al Bot de Telegram a través de un Cloudflare Worker
    const sendToTelegram = useCallback(async () => {
        if (!generatedImage || !generatedText) {
            setTelegramStatus('Please generate content first.');
            return;
        }

        setTelegramStatus('Sending to Telegram...');
        // IMPORTANTE: Reemplaza esto con la URL real de tu Cloudflare Worker
        // Esta URL apuntará al Cloudflare Worker que desplegarás por separado.
        const workerUrl = 'YOUR_CLOUDFLARE_TELEGRAM_WORKER_URL_HERE'; // *** REEMPLAZA ESTA URL ***

        try {
            const response = await fetch(workerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Envía los datos de la imagen en base64 (sin el prefijo "data:image/png;base64,") y el pie de foto
                body: JSON.stringify({
                    image_base64: generatedImage.split(',')[1], // Extrae la parte base64
                    caption: generatedText
                })
            });

            const result = await response.json();

            if (response.ok) {
                setTelegramStatus('Content sent to Telegram successfully!');
            } else {
                // Muestra el error del Worker si está disponible, de lo contrario un mensaje genérico
                setTelegramStatus(`Failed to send to Telegram: ${result.error || 'Unknown error'}`);
                console.error('Telegram Worker Error:', result);
            }
        } catch (err) {
            // Captura errores de red o problemas con la URL del Worker
            setTelegramStatus(`Error sending to Telegram: ${err.message}`);
            console.error('Network or Worker call error:', err);
        }
    }, [generatedImage, generatedText]); // Dependencias para useCallback

    // Función para compartir contenido en otras redes sociales usando la Web Share API
    const shareOnSocialMedia = useCallback(() => {
        if (!generatedText) {
            alert('Please generate content first to share.');
            return;
        }

        // Intenta usar la Web Share API para compartir texto.
        // La compartición directa de imágenes en base64 a menudo no es compatible con la Web Share API
        // o con las plataformas de redes sociales de destino sin una URL pública.
        if (navigator.share) {
            navigator.share({
                title: 'EbayCoolFinds Post',
                text: generatedText,
                // Los archivos (imágenes) son complicados con la Web Share API y base64.
                // Para compartir imágenes directamente, el usuario necesitaría descargar y subir.
                // O si la imagen estuviera alojada públicamente, podríamos proporcionar su URL aquí.
            }).then(() => {
                console.log('Content shared successfully');
            }).catch((error) => {
                console.error('Error sharing:', error);
                alert('Failed to share content. You might need to copy text and download image manually for some platforms.');
            });
        } else {
            // Fallback para navegadores que no son compatibles con la Web Share API
            alert('Your browser does not support direct sharing. Please copy the text and download the image manually to share on social media.');
            // Opcionalmente, podrías proporcionar enlaces para abrir diálogos de compartir de redes sociales específicas
            // ej., window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(generatedText)}`);
        }
    }, [generatedText]); // Dependencias para useCallback

    return (
        // Contenedor principal con Tailwind CSS para diseño responsivo y estilo general
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-inter">
            {/* NO NECESITAS LAS ETIQUETAS <link> y <style> AQUÍ. ESTÁN EN PUBLIC/INDEX.HTML AHORA. */}
            {/* El Tailwind CSS CDN y la fuente Inter se cargan en public/index.html */}

            {/* Tarjeta de contenido principal con sombra y esquinas redondeadas */}
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-2xl flex flex-col items-center">
                {/* Título de la aplicación */}
                <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Content Generator for @EbayCoolFinds</h1>
                {/* Descripción de la aplicación */}
                <p className="text-gray-600 text-center mb-8">
                    Select a content pillar or generate random content for an image and an Instagram caption.
                </p>

                {/* Menú desplegable para seleccionar pilares de contenido */}
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
                        {/* Icono de flecha del menú desplegable */}
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Botones para la generación de contenido (manual y aleatorio) */}
                <div className="flex flex-col sm:flex-row w-full gap-4 mb-6">
                    <button
                        onClick={() => handleGenerateContent(false)} // Selección manual
                        className={`flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${isLoading || !selectedPillar ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={isLoading || !selectedPillar}
                    >
                        {isLoading && !selectedPillar ? ( // Muestra el spinner de carga si se selecciona un pilar y está cargando
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
                        onClick={() => handleGenerateContent(true)} // Generación aleatoria
                        className={`flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading && selectedPillar === '' ? ( // Muestra el spinner de carga si no se selecciona ningún pilar (lo que implica aleatorio)
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


                {/* Área de visualización de mensajes de error */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mt-6 w-full" role="alert">
                        <strong className="font-bold">Error!</strong>
                        <span className="block sm:inline"> {error}</span>
                    </div>
                )}

                {/* Área de visualización de contenido generado */}
                {(generatedImage || generatedText) && (
                    <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-xl w-full">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">Generated Content:</h2>

                        {generatedImage && (
                            <div className="mb-6 flex flex-col items-center">
                                <h3 className="text-xl font-medium text-gray-700 mb-2">Image:</h3>
                                <div className="relative">
                                    {/* Ruta de la imagen del logo - Asegúrate que el nombre del archivo sea exacto y esté en la carpeta public */}
                                    <img
                                        src={generatedImage}
                                        alt="Generated Instagram Content"
                                        className="w-full h-auto rounded-lg shadow-md max-w-md mx-auto block"
                                    />
                                    <img
                                        src="/ebay-cool-finds-logo.png" // RUTA CORREGIDA DEL LOGO
                                        alt="EbayCoolFinds Logo Profile"
                                        className="absolute bottom-2 right-2 w-16 h-16 object-contain rounded-full border-2 border-white shadow-lg"
                                        onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/64x64/cccccc/ffffff?text=Logo"; }} // Imagen de fallback si el logo real no se encuentra
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
                                {/* Botón para enviar contenido al Bot de Telegram a través de un Cloudflare Worker */}
                                <button
                                    onClick={sendToTelegram}
                                    className={`mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 ${!generatedImage || !generatedText ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={!generatedImage || !generatedText}
                                >
                                    Send to Telegram Bot (InstagramECF)
                                </button>
                                {telegramStatus && <p className="text-sm text-center mt-2">{telegramStatus}</p>}

                                {/* Botón para compartir contenido en otras plataformas de redes sociales */}
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