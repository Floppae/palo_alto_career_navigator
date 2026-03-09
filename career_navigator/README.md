Candidate Name: Ethan Shim
Scenario Chosen: Skill-Bridge Career Navigator
Estimated Time Spent: 4 hours
Quick Start: npm install
● Prerequisites: Node.js 18+, npm, and an OpenAI API Key.
● Run Commands: npm run dev
● Test Commands: npm test
AI Disclosure:
● Did you use an AI assistant (Copilot, ChatGPT, etc.)? (Yes/No) - Yes
● How did you verify the suggestions? - Documentation + Other AI prompts + knowledge of best practices
● Give one example of a suggestion you rejected or changed: When providing the links for learning resources, the AI suggested to build out its own links which I knew would lead to inconsistent learning resource links as AI may hallucinate and assume a link exists when it in fact does not. If I had more time I would utilize a search api like Brave API to ensure site contents before displaying the resource to the user. However, for times sake, I simply chose to provide a more robust guidline for link generation (fallbacks to course provider homepage if confidence of existence was low), as well as link validation to ensure it was a valid link.
Tradeoffs & Prioritization:
● What did you cut to stay within the 4–6 hour limit? - Database for user profiles / job descriptions to keep a self updating record for further fallback resilience when AI is not available. Brave API for link validation.
● What would you build next if you had more time? - I would not rely so heavily on AI for data processing. I would pull real job descriptions for the target role, and compare the user profile against several different job postings to create a more robust profile of what skills are 'needed' for each position as well as what skills are helpful but not necessary.
● Known limitations: Relies too heavily on AI, which can lead to hallucinations and dead links as well as general feedback regarding skill grading. With a more robust dataset of real job positions of the desired job, we can weight each skill differently and give the user a more accurate representation of where they stand as well as a more accurate representation of what they need to learn first.

Link to Demo: https://www.youtube.com/watch?v=vXkXOjTTpSw&feature=youtu.be
