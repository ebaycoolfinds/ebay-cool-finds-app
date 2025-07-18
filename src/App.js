import React, { useState, useCallback, useMemo } from 'react';

// Main App component
const App = () => {
    // State variables for managing the application's data and UI
    const [selectedPillar, setSelectedPillar] = useState(''); // Stores the currently selected content pillar
    const [generatedImage, setGeneratedImage] = useState(''); // Stores the URL of the generated image
    const [generatedText, setGeneratedText] = useState(''); // Stores the generated Instagram caption
    const [isLoading, setIsLoading] = useState(false); // Indicates if content is currently being generated
    const [error, setError] = useState(''); // Stores any error messages
    const [telegramStatus, setTelegramStatus] = useState(''); // Status message for Telegram send

    // Define the content pillars with their IDs, display names, and base prompts for image generation
    // All names and prompts are now strictly in English.
    const contentPillars = useMemo(() => [
        { id: 'freshly_arrived_treasure', name: 'The Freshly Arrived Treasure', prompt: 'A close-up, overhead shot of hands carefully opening a branded, slightly worn cardboard shipping box (with subtle "eBay" or generic shipping labels), revealing a unique, identifiable vintage item (e.g., a retro camera, a classic vinyl record, a quirky ceramic vase) wrapped in protective material. Focus on the item\'s first reveal and the texture of the packaging. Soft, natural light. Realistic photo.' },
        { id: 'popular_collectibles', name: 'Popular Collectibles', prompt: 'A clean, well-lit studio shot of a single, highly recognizable and popular collectible item (e.g., a vintage Star Wars action figure, a rare baseball card in a protective sleeve, a classic comic book cover, a limited edition sneaker). The item should be the clear focus, showcasing its iconic details and broad appeal. Neutral background. Realistic photo.' },
        { id: 'vintage_charm', name: 'The Pre-Loved Style', prompt: 'A stylish flat lay featuring a high-quality, pre-owned fashion item (e.g., a vintage leather jacket, a unique designer handbag, a classic pair of sneakers) artfully arranged on a clean, minimalist background, perhaps with a subtle tag indicating "pre-loved." Focus on the item\'s texture, quality, and timeless appeal. Bright, airy lighting. Realistic photo.' },
        { id: 'the_deal_hunt', name: 'The Digital Deal Hunt', prompt: 'A close-up of a hand holding a smartphone or tablet, displaying an active eBay listing or a "Sold" item with a significantly discounted price. The background is slightly blurred, suggesting a cozy home environment. Focus on the digital interface and the excitement of a successful online find. Soft, warm lighting. Realistic photo.' },
        { id: 'stylish_home_decor', name: 'Stylish Home Finds', prompt: 'A well-composed shot of a stylish and identifiable home decor item (e.g., a decorative ceramic vase with fresh flowers, a plush throw pillow with an interesting pattern, a framed abstract art piece, a distinctive table lamp) prominently displayed in a modern, inviting living space. Focus on how the item adds character and personality to the room. Natural, inviting light. Realistic photo.' },
        { id: 'the_sellers_corner', name: 'The Seller\'s Corner', prompt: 'An overhead shot of hands carefully photographing or packaging an item for sale on eBay. The item (e.g., a vintage camera, a collectible toy, a piece of clothing) is well-lit and ready for its new home. Subtle hints of packaging materials or a clean workspace. Realistic photo.' },
        { id: 'retro_tech_gaming', name: 'Iconic Retro Tech & Gaming', prompt: 'A sleek, modern desk setup featuring a prominent, functional and iconic retro tech item or gaming console (e.g., an original Nintendo Entertainment System with its grey controller, a vintage Sony Walkman with headphones, a classic Macintosh computer, an old arcade joystick). Focus on the nostalgic appeal and the item\'s recognizable design. Clean, focused lighting. Realistic photo.' },
        { id: 'era_icons', name: 'Nostalgic Era Icons', prompt: 'A close-up of a well-known, iconic item from a specific past decade (e.g., a classic 80s boombox, a vintage rotary telephone, a retro lava lamp, a classic Polaroid camera) placed in a contemporary setting, with a subtle play of light and shadow emphasizing its nostalgic appeal. Focus on the item\'s design and its cultural significance. Moody, artistic lighting. Realistic photo.' },
        { id: 'trendy_items_ebay', name: 'Trendy Items on eBay', prompt: 'A clean, well-lit studio shot of a single, highly fashionable or trending item currently popular on eBay (e.g., a specific style of sneaker, a popular tech gadget, a trending fashion accessory, a modern collectible). The item should be the clear focus, showcasing its contemporary appeal. Neutral background. Realistic photo.' },
        { id: 'most_sought_after', name: 'Most Sought-After Finds', prompt: 'A dramatic close-up of a highly coveted and hard-to-find item on eBay (e.g., a rare vintage video game, a limited edition designer toy, a first-edition book, a specific model of collectible car). The item should be presented as a prized possession, with subtle emphasis on its rarity and desirability. Elegant, focused lighting. Realistic photo.' },
    ], []);
    
    // The API key is now read from the global 'window' variable injected in index.html
    const apiKey = window.REACT_APP_GEMINI_API_KEY;

    // Function to handle content generation (image and text)
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

            // --- Step 1: Generate Image using Imagen 3.0 ---
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

            // --- Step 2: Generate Text Caption using Gemini 2.0 Flash ---
            // The prompt now asks for the main caption AND hashtags separated by a new line.
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

    // Function to send content to Telegram Bot via a Cloudflare Worker
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
                    caption: generatedText // Send the full caption to the Worker
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

    // Function to share content on other social media using the Web Share API
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