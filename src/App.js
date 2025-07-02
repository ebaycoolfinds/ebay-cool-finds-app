import React, { useState, useCallback } from 'react';

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
    const contentPillars = [
        { id: 'discovery', name: 'The Thrill of Discovery', prompt: 'A person experiencing surprise and wonder, looking at something amazing just out of frame, with a bright, curious expression. Focus on the emotion of discovery and a sense of awe. Realistic photo.' },
        { id: 'lifestyle', name: 'The Online Treasure Hunter Lifestyle', prompt: 'A person with a thoughtful and satisfied expression, holding a unique, non-descript vintage item. The setting suggests a cozy, curated space, like a home office or a reading nook. Focus on the lifestyle and joy of finding unique items. Realistic photo.' },
        { id: 'community', name: 'The Smart Shopper Community', prompt: 'Two or three diverse people happily interacting around a tablet or smartphone, sharing a moment of excitement over an online find. They are smiling and engaged. Focus on connection and shared joy. Realistic photo.' },
        { id: 'inspiration', name: 'Inspiration and Creativity', prompt: 'Hands arranging abstract, colorful elements or non-descript unique objects in a creative way on a clean surface, suggesting new ideas and possibilities for home decor or hobbies. Focus on creativity and arrangement. Realistic photo.' },
        { id: 'transformation', name: 'The Transformation Potential', prompt: 'A split image or a subtle transition showing a dull, uninspired space on one side and the same space looking vibrant and personalized on the other, implying a "cool find" made the difference. Focus on transformation and aesthetic improvement. Realistic photo.' },
        { id: 'gifting', name: 'The Joy of Gifting', prompt: 'Hands exchanging a beautifully wrapped, non-descript gift package, with both people smiling warmly. Focus on the happiness of giving and receiving a special item. Realistic photo.' },
        { id: 'aha_moment', name: 'The "Aha!" Moment', prompt: 'A person with a sudden look of inspiration, a lightbulb moment, while browsing on a tablet or computer. Focus on the spark of an idea or solution found online. Realistic photo.' },
        { id: 'sustainable_finds', name: 'Sustainable Finds', prompt: 'Hands carefully examining a pre-loved, unique item, with a soft, appreciative touch. The background suggests a conscious, eco-friendly lifestyle. Focus on sustainability and finding new life for items. Realistic photo.' },
    ];

    // Placeholder for the API key. Canvas will inject the actual key at runtime.
    const apiKey = "";

    // Function to handle content generation (image and text)
    const handleGenerateContent = useCallback(async (isRandom = false) => {
        setError(''); // Clear previous errors
        setGeneratedImage(''); // Clear previous image
        setGeneratedText(''); // Clear previous text
        setTelegramStatus(''); // Clear previous Telegram status

        let pillarToGenerate = selectedPillar;
        if (isRandom) {
            // Select a random pillar if the random button was clicked
            const randomIndex = Math.floor(Math.random() * contentPillars.length);
            pillarToGenerate = contentPillars[randomIndex].id;
            setSelectedPillar(pillarToGenerate); // Update the dropdown to show the selected random pillar
        }

        if (!pillarToGenerate) {
            setError('Please select a content pillar or generate random content.');
            return;
        }

        setIsLoading(true); // Set loading state to true

        try {
            // Find the selected pillar's data
            const pillar = contentPillars.find(p => p.id === pillarToGenerate);
            if (!pillar) {
                throw new Error('Content pillar not found.');
            }

            // --- Step 1: Generate Image using Imagen 3.0 ---
            const imagePayload = {
                instances: { prompt: pillar.prompt }, // Use the pillar's prompt for image generation
                parameters: { "sampleCount": 1 } // Ensure only one image is generated
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
                setGeneratedImage(imageUrl); // Update state with the generated image URL
            } else {
                throw new Error('Failed to generate image. Please try again.');
            }

            // --- Step 2: Generate Text Caption using Gemini 2.0 Flash ---
            // Construct a detailed prompt for the text generation based on the pillar name
            const textPrompt = `Write an engaging Instagram caption in English for an image representing "${pillar.name}". The caption should encourage interaction and include 5-7 relevant hashtags for an account named @EbayCoolFinds, focusing on online shopping, unique finds, and the joy of discovery. The tone should be enthusiastic and friendly. Provide only the caption text, without any introductory phrases or comments.`;

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
                setGeneratedText(generatedCaption); // Update state with the generated text
            } else {
                throw new Error('Failed to generate text. Please try again.');
            }

        } catch (err) {
            console.error("Error generating content:", err);
            setError(`Error: ${err.message || 'An unexpected error occurred.'}`);
        } finally {
            setIsLoading(false); // Reset loading state
        }
    }, [selectedPillar, contentPillars]); // Dependencies for useCallback

    // Function to send content to Telegram Bot via a Cloudflare Worker
    const sendToTelegram = useCallback(async () => {
        if (!generatedImage || !generatedText) {
            setTelegramStatus('Please generate content first.');
            return;
        }

        setTelegramStatus('Sending to Telegram...');
        // IMPORTANT: Replace this with your actual Cloudflare Worker URL
        // Example: const workerUrl = 'https://your-telegram-worker.yourusername.workers.dev/';
        const workerUrl = 'YOUR_CLOUDFLARE_TELEGRAM_WORKER_URL_HERE'; // *** REPLACE THIS URL ***

        try {
            const response = await fetch(workerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_base64: generatedImage.split(',')[1], // Extract base64 part
                    caption: generatedText
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
    }, [generatedImage, generatedText]); // Dependencies for useCallback

    // Function to share content on other social media
    const shareOnSocialMedia = useCallback(() => {
        if (!generatedText) {
            alert('Please generate content first to share.');
            return;
        }

        // Attempt to use Web Share API for text
        if (navigator.share) {
            navigator.share({
                title: 'EbayCoolFinds Post',
                text: generatedText,
                // Files (images) are tricky with Web Share API and base64.
                // For direct image sharing, user would need to download and upload.
                // Or if the image was hosted publicly, we could provide its URL here.
            }).then(() => {
                console.log('Content shared successfully');
            }).catch((error) => {
                console.error('Error sharing:', error);
                alert('Failed to share content. You might need to copy text and download image manually for some platforms.');
            });
        } else {
            // Fallback for browsers that don't support Web Share API
            // Provide options to copy text or open generic share links
            alert('Your browser does not support direct sharing. Please copy the text and download the image manually to share on social media.');
            // Optionally, you could open specific share links like:
            // window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(generatedText)}`);
            // window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(generatedText)}`);
        }
    }, [generatedText]); // Dependencies for useCallback

    return (
        // Main container with Tailwind CSS for responsive design and styling
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-inter">
            {/* Tailwind CSS for Inter font */}
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
            <style>
                {`
                body {
                    font-family: 'Inter', sans-serif;
                }
                `}
            </style>

            {/* Content Generator Card */}
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-2xl flex flex-col items-center">
                {/* App Title */}
                <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Content Generator for @EbayCoolFinds</h1>
                <p className="text-gray-600 text-center mb-8">
                    Select a content pillar or generate random content for an image and an Instagram caption.
                </p>

                {/* Pillar Selection Dropdown */}
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

                {/* Generate Buttons */}
                <div className="flex flex-col sm:flex-row w-full gap-4 mb-6">
                    <button
                        onClick={() => handleGenerateContent(false)} // Manual selection
                        className={`flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${isLoading || !selectedPillar ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={isLoading || !selectedPillar}
                    >
                        {isLoading && !selectedPillar ? ( // Only show loading if a pillar is selected
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
                        onClick={() => handleGenerateContent(true)} // Random generation
                        className={`flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading && selectedPillar === '' ? ( // Show loading if no pillar is selected (implying random)
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


                {/* Error Message Display */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mt-6 w-full" role="alert">
                        <strong className="font-bold">Error!</strong>
                        <span className="block sm:inline"> {error}</span>
                    </div>
                )}

                {/* Generated Content Display */}
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
                                    {/* User's profile logo as a visual overlay/watermark reminder */}
                                    <img
                                        src="Screenshot 2025-06-25 at 12.20.19 PM.png" // User's provided logo file
                                        alt="EbayCoolFinds Logo Profile"
                                        className="absolute bottom-2 right-2 w-16 h-16 object-contain rounded-full border-2 border-white shadow-lg"
                                        onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/64x64/cccccc/ffffff?text=Logo"; }} // Fallback
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
                                {/* New Telegram Bot Button */}
                                <button
                                    onClick={sendToTelegram}
                                    className={`mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 ${!generatedImage || !generatedText ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={!generatedImage || !generatedText}
                                >
                                    Send to Telegram Bot (InstagramECF)
                                </button>
                                {telegramStatus && <p className="text-sm text-center mt-2">{telegramStatus}</p>}

                                {/* New Share Button */}
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