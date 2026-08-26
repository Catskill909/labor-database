# Draft reply to Chris Garlock — 25 Aug 2026 work

**Status: DRAFTED, NOT SENT.** Edit freely before sending.
Replies to his 25 Aug email "LHF database and media database follow-up questions".

**Deliberately not mentioned:** the 25 Aug production outage (18 min, resolved,
no data lost, nothing for him to action) and the quote-date findings (he never
asked; affects 3 entries out of 1,916).

---

```
Hi Chris,

Thanks for the detailed list — really helpful. Here's where things stand.

FIXED AND LIVE NOW

• Search is no longer case-sensitive. "Misère" and "Misère au Borinage" both
  return Misery in the Borinage correctly now. This turned out to affect far
  more than that one film — roughly one entry in seven had an accented letter
  or a curly apostrophe that made it unfindable. All searchable now.

• Alternate and translated titles work as part of the same fix, since most
  films carry them in the title itself.

• The flickering search results are fixed. That was a timing bug where a
  slower earlier search could overwrite a newer one.

• "Films From the Era" and "Music From the Era" are now "Related Films" and
  "Related Music".

• Drake, Gloria Gaynor and Moby are gone from July 12.

ON YOUR QUESTION ABOUT WHERE THE MUSIC CAME FROM

Those songs weren't pulled from an outside source — they were all entries in
your own database. The page was matching films and music by release year
against the years of that day's history and quotes. Some quotes carry recent
dates, so a quote dated 2016 was pulling in every 2016 song. I've changed it
to ignore quote dates, which is what removed those three.

TWO THINGS I'D LIKE YOUR STEER ON

1. Related Films and Music — right now they still match by year, so a 1933
   film appears next to a 1933 event. Honest, but not really "related". A
   better approach would be matching on shared subject tags, so a mining
   strike brings up mining films. Would you prefer that, or hand-picked
   pairings you choose yourself?

2. Corrections — two choices:
   - Where it lives: our suggestion is a small "Suggest a correction" link at
     the bottom of an entry when you open it, so the person is already looking
     at the entry they want to fix. A button in the top bar would mean asking
     them to search for the entry first, which risks corrections landing on
     the wrong record.
   - What it asks for: either the entry's current details appear in an
     editable form and the user changes what's wrong (you'd see a
     before-and-after comparison and approve with one click), or a simple
     "what's wrong with this entry?" message box. I'd suggest the first, since
     you'll be reviewing these regularly.

   Either way corrections go into a review queue — nothing changes on the site
   until you approve it.

STRAIGHTFORWARD

• Corrections and updates — ready to build as soon as you answer the two
  questions above.
• Bulk import from the Labor Quotes site — practical. It's on Weebly, which
  has no clean export, so we'd either use the site's feed or read the pages
  directly. Worth confirming you're happy for us to pull the content, and
  whether you have access to that Weebly account.

NEEDS MORE DISCUSSION

• Adding new tags as the database evolves. Very doable, but worth a short
  conversation about who manages the vocabulary and how tightly we control it,
  since tags drive filtering and any future "related" matching. If you're
  thinking about Library of Congress subject headings at some point, that
  changes the design and is much easier to build in now than retrofit.

HOW I'D PRIORITISE

1. Related Films/Music matching (needs your answer on tags vs hand-picked)
2. Corrections and updates
3. Labor Quotes import
4. Tag management

I'll come back to you separately on the Media Archive items.

In solidarity,
Paul
```

---

## Why the LCSH note is in there

Paul's own `CLAUDE.md` documents that `Entry.tags` is a comma-separated string,
safe only because no current tag contains a comma. Real Library of Congress
subject headings routinely do (`Labor unions, American`). If LHF is heading that
way, the tag storage has to change **before** the mapping, not after — cheap to
raise now, expensive to retrofit.

## Billing recorded separately

2.0 hrs, 25 Aug 2026. Reduced rate (progressive non-profit).
