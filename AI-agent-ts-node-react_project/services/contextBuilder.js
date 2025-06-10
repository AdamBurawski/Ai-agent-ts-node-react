// Build context from transcripts
function buildContext(transcripts) {
  let context = "Ze stenogramów przesłuchań wynika:";
  transcripts.forEach((t, index) => {
    context += `\nŚwiadek ${index + 1}: ${t.text}`;
  });
  return context;
}

module.exports = { buildContext };
