// Question bank for a 90-second pause.
//
// Each session follows a gentle arc:
//   1. ground  - one question to arrive in the body
//   2. explore - curious, non-judging questions about the sensation
//   3. allow   - a closing question or two about making room for what's here
//
// Edit freely. Keep each question short, first-person, and ending in "?".
// `from` notes the lineage a question draws on; it is not shown in the app.

window.QUESTIONS = {
  ground: [
    { text: "Where do my feet meet the floor?" },
    { text: "What happens if I slow my exhale?" },
    { text: "Where is my body being supported right now?", from: "ACT" },
    { text: "Can I feel the air on my skin?", from: "ACT" },
  ],

  explore: [
    // Where it is
    { text: "Where do I feel this most?" },
    { text: "How big is this sensation?" },
    { text: "Where does this sensation start and end?" },
    { text: "Is this sensation on the surface, or deeper?" },
    { text: "Is there a center?" },
    { text: "Are the edges sharp or soft?" },

    // What it is like
    { text: "What is its texture?" },
    { text: "Is it tight?" },
    { text: "Is it buzzing?" },
    { text: "Is it hollow?" },
    { text: "Is it sharp?" },
    { text: "Is it warm or cold?" },
    { text: "Does it have a color?" },
    { text: "Does it have a shape?" },
    { text: "Does it have weight?" },

    // How it moves
    { text: "Is it moving?" },
    { text: "Does it pulse?" },
    { text: "Is there a rhythm to it?" },
    { text: "How strong is it right now?" },
    { text: "Does it change when I breathe?" },

    // What else is here
    { text: "What is the quietest part?" },
    { text: "Is any of it neutral?" },

    // Felt sense
    { text: "If this had a word or an image, what would it be?", from: "Gendlin" },
    { text: "Does that word fit, or is there a better one?", from: "Gendlin" },
    { text: "Is this feeling familiar?", from: "Maté" },
  ],

  allow: [
    { text: "Can I make a little room for this?", from: "ACT" },
    { text: "Can I let this be here, just as it is?", from: "ACT" },
    { text: "Can I say hello to what's here?", from: "Gendlin" },
    { text: "What does this part of me need right now?", from: "Maté" },
    { text: "Can I meet this with kindness?", from: "Magee" },
    { text: "Who else might be feeling something like this right now?", from: "Magee" },
    { text: "Can I let this wave move through me?", from: "Bolte Taylor" },
    { text: "What happens if I simply watch it?", from: "Bolte Taylor" },
  ],
};
