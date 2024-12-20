const fs = require('fs').promises;

async function queryXAI(contentt) {
    try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer xai-SKIBIDFI_OTILET'
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: "system",
                        content: "You are a content analyzer focused on identifying Linux-related content. Return true if content is related to Linux, false otherwise. Respond with JSON only."
                    },
                    {
                        role: "user",
                        content: `Analyze this content and determine if it's related to Linux (including distributions like Ubuntu, Debian, etc.):
${contentt}

Format your response as valid JSON only:
{
    "isLinuxRelated": true/false,
    "confidence": 0-1,
    "reason": "brief explanation"
}`
                    }
                ],
                model: "grok-beta",
                stream: false,
                temperature: 0
            })
        });

        const data = await response.json();

        const content = data.choices[0].message.content;

        try {
            return JSON.parse(content);
        } catch (e) {
            try {
                const cleaned = content
                    .replace(/```json\s*/g, '')
                    .replace(/```\s*/g, '')
                    .trim();
                return JSON.parse(cleaned);
            } catch (e2) {
                try {
                    const jsonMatch = content.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        return JSON.parse(jsonMatch[0]);
                    }
                } catch (e3) {
                    console.error('Failed to parse JSON response:', content);
                    return null;
                }
            }
        }
    } catch (error) {
        console.error('bullshit elon muusck error:', error);
        return null;
    }
}

async function filterLinuxEntries(inputFile, outputFile) {
    try {
        console.log(`Reading ${inputFile}...`);
        const rawData = await fs.readFile(inputFile, 'utf8');
        const data = JSON.parse(rawData);

        const filteredData = [];
        const removedEntries = []; // For logging purposes only

        for (const entry of data) {
            const contentToAnalyze = `
                Title: ${entry.title || ''}
                Description: ${entry.description || ''}
                Slogan: ${entry.slogan || ''}
                URL: ${entry.url || ''}
            `;

            console.log(`\nAnalyzing entry: ${entry.url}`);
            const analysis = await queryXAI(contentToAnalyze);

            if (!analysis) {
                console.log('Analysis failed, keeping entry by default');
                filteredData.push(entry);
                continue;
            }

            if (analysis.isLinuxRelated && analysis.confidence > 0.7) {
                console.log(`Removed: ${entry.url}`);
                console.log(`Reason: ${analysis.reason}`);
                
                removedEntries.push({
                    url: entry.url,
                    reason: analysis.reason,
                    confidence: analysis.confidence
                });
            } else {
                filteredData.push(entry);
            }
        }

        console.log(`\nWriting filtered data to ${outputFile}...`);

        await fs.writeFile(
            outputFile,
            JSON.stringify(filteredData, null, 2),
            'utf8'
        );

        console.log('\nFiltering completed!');
        console.log(`Original entries: ${data.length}`);
        console.log(`Remaining entries: ${filteredData.length}`);
        console.log(`Removed entries: ${removedEntries.length}`);

        return {
            filtered: filteredData,
            removed: removedEntries
        };
    } catch (error) {
        console.error('Error processing file:', error);
        throw error;
    }
}

async function run() {
    try {
        await filterLinuxEntries('data.json', 'filtered_data.json');
    } catch (error) {
        console.error('Fatal error:', error);
    }
}

run();