# VivaVoce — Product Spec

## One line

A voice-first study partner that asks you questions, listens to your spoken
answers, and coaches you toward confident, well-structured delivery.

## Who it's for

- University students preparing for **oral exams / vivas** (medicine, law, eng.)
- **Job seekers** rehearsing interview answers
- **Language learners** improving spoken clarity
- **Presenters** rehearsing explanations until they're effortless

## The core loop

```
choose mode/deck → AI asks a question → you answer by voice →
transcribe → evaluate (5 axes) → spoken + written feedback →
score breakdown + improved answer + next drill → remember weak areas
```

## Practice modes

| Mode                  | Shape                                                            |
| --------------------- | --------------------------------------------------------------- |
| **Quick Question**    | One question, one answer, instant feedback. The default warm-up. |
| **Mock Viva**         | A chained examiner: each follow-up targets *your* weakest axis.  |
| **Interview**         | Behavioural + role questions, STAR-structure scoring.            |
| **Flash Recall**      | Rapid recall of facts/definitions, spaced by weakness.           |
| **Explain Like a Teacher** | Scored on clarity & pedagogy, not just correctness.        |
| **Timed Rapid Fire**  | A countdown per question; trains composure and concision.        |

## Feedback model (the rubric)

Every answer is scored 0–100 on five axes, then summarised:

1. **Correctness / relevance** — did you answer the actual question?
2. **Clarity** — could a peer follow it?
3. **Structure** — signposting, logical order, a landing.
4. **Conciseness** — signal vs. filler.
5. **Confidence** — hedging, fillers, pace, decisiveness (delivery signals).

Plus derived signals: filler-word rate, words-per-minute (when timing is
available), completeness, a **suggested improved answer**, and a **targeted next
drill**. Scores are coaching estimates, never grades (see COMPLIANCE.md).

## Voice-session state machine

```
        ┌─────────┐  tap record   ┌───────────┐  tap stop   ┌────────────┐
        │  idle   │ ────────────▶ │ listening │ ──────────▶ │ processing │
        └─────────┘               └───────────┘             └────────────┘
             ▲                          │ cancel                  │
             │                          ▼                         ▼
             │                     ┌─────────┐            ┌────────────────┐
             └──── new question ── │  idle   │            │ feedback-ready │
                                   └─────────┘            └────────────────┘
                                                                  │ retry
                                                                  ▼
                                                          ┌──────────────┐
                                                          │ retry-needed │
                                                          └──────────────┘
Edge states (overlay any of the above):
  offline · failed-upload · partial-transcript · ai-unavailable
```

Degraded-mode rules:

- **AI slow** → optimistic "thinking" state with a 20s soft timeout, then offer
  "keep waiting / save & review later".
- **AI down** → store the transcript, mark feedback `pending`, queue a retry;
  user still gets transcript + self-review checklist.
- **Transcription fails** → keep the audio, offer re-transcribe or type answer.
- **Network flaky** → record locally, queue upload (idempotent by client id).
- **App closed mid-session** → session is resumable; nothing is lost.

## Information architecture — mobile screen map

```
(auth)           sign-in · sign-up · verify
(onboarding)     goal → level → subjects → audio+privacy consent → profile
(app) tabs:
  Home           streak · quick-start · resume · weak areas · recommended · schedule
  Practice       mode picker → session → feedback → session summary
  Progress       trends · confidence line · weakness heatmap · topic mastery · history
  Library        decks · questions · create deck · import set
  Settings       profile · security · notifications · privacy · data export · delete
session/[id]     the voice engine (idle…feedback states)
deck/[id]        deck detail · questions
report/[id]      downloadable session report
```

## IA — website sitemap

```
/                home (hero · how it works · modes · proof · waitlist)
/features        the five-axis rubric, modes, voice engine
/how-it-works    the loop, step by step
/use-cases       /use-cases/students · /interviews · /presentations · /language
/privacy         privacy policy (voice-data forward)
/terms           terms of use (coaching-not-grading disclaimer)
/faq             objections + answers
/contact         support
/waitlist        early-access capture (also embedded on /)
/legal/*         security.txt, accessibility statement
```

## Permission / role map

| Role            | Can                                                              |
| --------------- | --------------------------------------------------------------- |
| `learner`       | own sessions/decks/answers/schedules; export & delete own data  |
| `coach`         | learner + read shared learner progress within their org         |
| `org_admin`     | manage org membership, seats, org decks; never reads raw audio  |
| `system`        | background jobs (AI eval, retention sweeps) — service identity   |

Every user-scoped resource is checked by **ownership + tenant**. No implicit
sharing. Audio is the most sensitive class and is never exposed across tenants.

## Key user journeys (happy paths)

1. **First viva rehearsal:** sign up → onboard (viva, intermediate, "Cardiology")
   → Mock Viva → answer 5 chained questions → see weakness heatmap → schedule a
   daily 10-min drill before the exam date.
2. **Interview the night before:** Quick Question on "Tell me about a conflict"
   → STAR feedback → "improve my answer" → retry → confidence trend ticks up.
3. **Offline on a train:** record three Flash Recall answers offline → app
   queues them → on reconnect they upload + evaluate idempotently.
