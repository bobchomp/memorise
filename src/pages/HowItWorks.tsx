import { Link } from 'react-router-dom'

export default function HowItWorks() {
  return (
    <article className="prose" style={{ marginTop: 16 }}>
      <h1>How it works</h1>
      <p>
        Memorise is built on a few findings from memory research that hold up again and again. None of them are tricks.
        They're about <em>how</em> you spend your practice time.
      </p>

      <h2>1. Recalling beats rereading</h2>
      <p>
        Pulling something out of memory strengthens it far more than reading it again. This is the <strong>testing effect</strong>{' '}
        (Roediger &amp; Karpicke, 2006). That's why most modes hide the text and make you produce it: typing first letters,
        filling blanks, writing it out, reciting. Getting it wrong and then seeing the answer still helps, so don't be afraid
        of mistakes.
      </p>

      <h2>2. Spread it out</h2>
      <p>
        Reviews spaced over days beat the same time crammed into one sitting (the <strong>spacing effect</strong>; Cepeda et al., 2006).
        Each part of your text gets its own schedule from <strong>FSRS</strong>, the open-source algorithm Anki uses. Parts you
        find easy come back rarely. Shaky ones come back soon. Aim for a short daily review.
      </p>

      <h2>3. Fade the support away</h2>
      <p>
        You start with the full text, then only first letters, then words vanish until nothing's left. Removing cues
        step by step (<strong>vanishing cues</strong>; Glisky, Schacter &amp; Tulving, 1986) keeps practice just hard enough. The
        first-letter technique is a staple for actors and anyone learning long passages, because each initial is enough to
        trigger the word without giving it away.
      </p>

      <h2>4. Build it up in pieces</h2>
      <p>
        Long texts are split into parts (lines, sentences or paragraphs). <strong>Build up</strong> adds one part at a time
        and makes you recall from the beginning each round, so the joins between parts get practised too. The joins are
        where people usually get stuck. <strong>Cue cards</strong> train the same thing: see one part, recall the next.
      </p>

      <h2>5. Say it out loud</h2>
      <p>
        Reading aloud improves memory compared with silent reading (the <strong>production effect</strong>; MacLeod et al., 2010).
        Use <strong>Read &amp; listen</strong> and <strong>Recite aloud</strong>, especially if you'll perform the text.
      </p>

      <h2>6. Mix it up and sleep on it</h2>
      <p>
        Varied practice (different games on the same text) and effort that feels hard are <strong>desirable difficulties</strong>{' '}
        (Bjork, 1994). They slow you down today and make the memory last. Sleep consolidates what you've practised, so a
        short session before bed and a quick review in the morning work well together.
      </p>

      <h2>A good routine</h2>
      <ol>
        <li>Add your text and pick its language.</li>
        <li>Select the first few parts and press <strong>Start learning</strong> for the guided path.</li>
        <li>Each day, clear your <Link to="/review">Review</Link> list first, then learn a few new parts.</li>
        <li>Every so often, test the whole text with <strong>Write it out</strong> or <strong>Recite aloud</strong>.</li>
      </ol>

      <h2>Languages</h2>
      <p>
        When you add a text you choose its language: English, French, Scottish Gaelic, German or Spanish. The app uses this to
        split words properly (French <em>l'homme</em>, Gaelic <em>a' chlann</em>, <em>t-sràid</em>, <em>na h-oidhche</em>), to
        accept a missing accent as a near miss instead of plain wrong, to treat ß and ss as the same, and to choose a voice for
        reading aloud. Most browsers have no Scottish Gaelic voice, so for Gaelic you read aloud yourself.
      </p>

      <h2>References</h2>
      <ul className="small muted">
        <li>Roediger, H. L., &amp; Karpicke, J. D. (2006). Test-enhanced learning. <em>Psychological Science</em>, 17(3), 249–255.</li>
        <li>Cepeda, N. J., et al. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. <em>Psychological Bulletin</em>, 132(3), 354–380.</li>
        <li>Glisky, E. L., Schacter, D. L., &amp; Tulving, E. (1986). Learning and retention of computer-related vocabulary in memory-impaired patients: Method of vanishing cues. <em>Journal of Clinical and Experimental Neuropsychology</em>, 8(3), 292–312.</li>
        <li>MacLeod, C. M., et al. (2010). The production effect: Delineation of a phenomenon. <em>Journal of Experimental Psychology: Learning, Memory, and Cognition</em>, 36(3), 671–685.</li>
        <li>Bjork, R. A. (1994). Memory and metamemory considerations in the training of human beings. In <em>Metacognition: Knowing about knowing</em>. MIT Press.</li>
        <li>Ye, J., Su, J., &amp; Cao, Y. (2022). A stochastic shortest path algorithm for optimizing spaced repetition scheduling. <em>KDD '22</em>. FSRS: github.com/open-spaced-repetition</li>
      </ul>
    </article>
  )
}
