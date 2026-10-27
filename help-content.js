// Help texts for the superiors: the ? panel on each page (help.js) and the full
// guide (help.html) are both built from this list. Only this file differs per
// clan site; help.js and help.html are the same on every site.
//
// Writing rules, so the browser's translation (Turkish and others) stays clear:
//   - short sentences, one idea each, simple words, no slang
//   - name buttons exactly as on the page, with their emoji, in **bold**
//   - plain text only, except **bold** (no HTML)
//
// Per page:
//   file     the page it belongs to (the ? panel shows on that page)
//   who      who can open the page
//   summary  one or two sentences: what the page is for
//   parts    [{ title, text }] or [{ title, list: [...] }]: what you see and can do
//            (owner: true = only the clan leader sees it)
//   howto    [{ q, steps: [...] }]: step-by-step tasks (only in the full guide)
window.HELP_CONTENT = {
  clanName: 'cCc Champions',
  home: 'dashboard.html',
  icon: 'favicon.png',
  // Help panel colours: accent = the clan colour, panel = a dark background.
  colors: { accent: '#ffb300', panel: '#232526' },

  // General chapters at the top of the full guide.
  intro: [
    {
      id: 'start',
      title: '👋 Welcome, superior',
      text: [
        'This guide explains the clan website for superiors.',
        'Superiors can open the management pages (Events, Members, Profiling, Warnings, Bank and Admin) and make changes. Regular members only see the Dashboard, Competition, Calendar and their own profile.',
        'On every page you see a round **?** button next to the page title. Click it for a short explanation of that page. Only superiors see this button.',
        'To come back to this guide: click **?** on any page, then **📖 Open the full guide**.'
      ]
    },
    {
      id: 'language',
      title: '🌐 Read the site in your own language',
      text: [
        'Your browser can translate every page of the site. This also works for this guide and for the **?** panels.',
        'Computer (Chrome or Edge): right-click anywhere on the page and choose **Translate to …**. Choose "Always translate English" to translate every page automatically.',
        'Phone (Chrome): tap the menu **⋮** and choose **Translate…**. Safari on iPhone: tap **aA** and choose **Translate**.',
        'The translation is done by a computer. Button names may be translated a little differently. The emoji on a button (for example 💾) stays the same, so look for the emoji.'
      ]
    },
    {
      id: 'login',
      title: '🔑 Signing in',
      text: [
        'Click **🔑 Login** at the top right and sign in with your Google account.',
        'Your Google account must be linked to your clan name, and you must be on the superiors list. If you do not see the management pages after signing in, ask the clan leader.',
        'You stay signed in on the same device. Click **Logout** on a shared computer.'
      ]
    },
    {
      id: 'words',
      title: '📚 Important words',
      list: [
        '**Period**: the stretch of time in which chest points are counted. The Dashboard shows when it ends. A period ends at the daily reset (17:00 UTC).',
        '**Target / required points**: the number of chest points a member must collect in a period.',
        '**Norm**: a target a member must reach, in a period or in an event.',
        '**Chest points**: every chest a member opens is worth a number of points. See **📋 Chest Points** on the Dashboard.',
        '**Chesttracker**: the program that reads the opened chests from the game and sends them to the website.',
        '**Penalty**: what a member gets for missing an event target: silver (paid to the clan bank) or extra chest points on their target.',
        '**Exemption**: a member who never gets an event penalty (for example a utility account).',
        '**Troop category**: the troop level of a member, for example G7 (Guardsmen level 7) or T8. Some events have a different target per category.',
        '**Reset**: the daily reset in the game, at 17:00 UTC.',
        '**Superior**: a member who may use the management pages.'
      ]
    },
    {
      id: 'safe',
      title: '🛟 Working safely',
      list: [
        'Changes are saved for the whole clan at once. Everybody sees them.',
        'When the site asks "Are you sure?", read the question before you click OK. Deleting often cannot be undone.',
        'Read the message after you click a button. It says if the change was saved or if something went wrong.',
        'Not sure? Calculate first and check the result before you apply it (for example **🧮 Calculate Penalties** before **⚖️ Apply Penalties**). Or ask the clan leader.'
      ]
    }
  ],

  pages: [
    {
      file: 'dashboard.html',
      icon: 'chests.png',
      title: 'Dashboard',
      who: 'Everyone',
      summary: 'Shows the chest points of every member, compared to the required points of the period.',
      parts: [
        { title: '⏳ Period Ends In', text: 'The time left until the current period ends. The period ends at 17:00 UTC on its last day.' },
        { title: '📅 Date Range Filter', text: '**Active Period** shows the current period. **Previous Period** shows the period before it. You can also choose your own start and end date.' },
        { title: 'Last Imported', text: 'The last time chests came in from the chesttracker. Chests opened after that time are not counted yet.' },
        { title: 'The numbers', text: 'Total chests, number of clan members, active players and total points for the chosen dates.' },
        { title: '🥇 Player Rankings', text: 'All members, highest points first. Type a name in the filter box to find a member. Click a column title to sort. Click **▶** next to a crypt type to see the chests per level.' },
        { title: '📋 Chest Points', text: 'Opens the list of how many points each chest is worth. Use the search box to find a chest.' }
      ],
      howto: [
        { q: 'How do I see who is behind on the target?', steps: [
          'Open the Dashboard and click **Active Period**.',
          'Look at the members with the lowest points in **🥇 Player Rankings**.',
          'Check **⏳ Period Ends In** to see how much time they still have.',
          'For a list over several periods, use **Profiling → 📉 Missed Norms**.'
        ] },
        { q: 'A member says chests are missing. What do I check?', steps: [
          'Check **Last Imported**. Chests opened after that time come in with the next import.',
          'Were the chests saved under a wrong name? Move them with **Admin → 📥 Chest data → 🔀 Move Chests**.',
          'Did the chesttracker miss the chests? Ask the clan leader. They can add them on **➕ Manual Chests**.'
        ] }
      ]
    },

    {
      file: 'events.html',
      icon: 'events.png',
      title: 'Events',
      who: 'Superiors',
      summary: 'Create clan events, record who took part, and give penalties to members who missed the event target.',
      parts: [
        { title: '📋 Manage Events', text: 'The list of events. Use **🟢 Active**, **🕐 Recent**, **📋 All** and **📁 Ended** to choose which events you see, and **Type** to show one kind of event. In **Actions** you can edit or delete an event.' },
        { title: '📊 Chest Events', text: 'Events counted from chests. Choose the event and click **🔄 Calculate Participation**.' },
        { title: '✏️ Manual Events', text: 'Events where you type in the points yourself.' },
        { title: '🎖️ Troop Events', text: 'Events with a different target per troop category (G7, G8, T8, G9, T9). You type in the points of each member.' },
        { title: '🦸 Hero Events', text: 'Checks if the hero level of each member went up enough during the event. It uses the hero levels entered on the Members page. It is calculated automatically one day after the event.' },
        { title: '➕ Create Event', text: 'Make one event by hand, make the coming events from the schedule (**📅 Generate Events**), or remove generated events that are not needed (**🧹 Clean Up Generated Events**).' },
        { title: '⚙️ Event Types', text: 'The kinds of events (for example Ragnarok) and how each kind is counted: from chests, troop targets, by hand, hero level, or only as a date (period marker).' },
        { title: '🗓️ Schedule', text: 'When each tournament comes back, and which events **📅 Generate Events** makes for it. The Calendar page shows this schedule too.' },
        { title: 'Penalty buttons (on every event tab)', list: [
          '**🙅‍♂️ Fill Non-Participants**: marks every member without an entry as "did not take part".',
          '**🧮 Calculate Penalties**: shows the proposed penalty for each member. Nothing is given yet. You can still change single amounts.',
          '**⚖️ Apply Penalties**: gives the penalties for real. Silver penalties go to the Bank. Chest point penalties raise the member\'s target.'
        ] }
      ],
      howto: [
        { q: 'How do I make the events for the coming month?', steps: [
          'Open **➕ Create Event**.',
          'Under **📅 Generate Upcoming Events from Calendar**, choose **Next 30 days**.',
          'Leave **All** ticked, or tick only the event types you want.',
          'Click **📅 Generate Events**.'
        ] },
        { q: 'How do I enter the points of a manual or troop event?', steps: [
          'Open **✏️ Manual Events** or **🎖️ Troop Events** and choose the event.',
          'Choose a member, type the points and click **💾 Save Entry** (or **💾 Save Points**).',
          'Many members? Click **📋 Batch Entry**. Choose a member, type the points and press Enter. Repeat. Click **💾 Save All** at the end.',
          'When everybody is entered, click **🙅‍♂️ Fill Non-Participants**.'
        ] },
        { q: 'How do I give the penalties after an event?', steps: [
          'Choose the event on its tab (Chest, Manual, Troop or Hero).',
          'Make sure all points are entered. For manual and troop events, click **🙅‍♂️ Fill Non-Participants**.',
          'Click **🧮 Calculate Penalties** and check the proposed penalty of each member.',
          'Correct a single amount if needed.',
          'Click **⚖️ Apply Penalties**.',
          'Members on **Admin → 🛡️ Exemptions** never get a penalty.'
        ] },
        { q: 'How do I create one event by hand?', steps: [
          'Open **➕ Create Event**.',
          'Type the name, choose the event type, the start date and the end date. Type the target points, or leave it empty to use the normal target.',
          'Troop event? Add a target per troop category under **🎖️ Troop Category Targets**.',
          'Want a penalty? Tick **Enable penalty for this event**, choose **💰 Silver** or **📦 Extra Chest Points**, and type the amount. A member who missed 40% of the target gets 40% of the penalty.',
          'Click **🎯 Create Event**.'
        ] },
        { q: 'Too many generated events. How do I remove them?', steps: [
          'Open **➕ Create Event** and scroll down to **🧹 Clean Up Generated Events**.',
          'Tick the event types above, and choose past, upcoming, or both.',
          'Click **🔍 Preview Cleanup**. Untick the events you want to keep.',
          'Click **🗑️ Delete**. Events with data, events you named yourself and Active Period events are never removed.'
        ] }
      ]
    },

    {
      file: 'members.html',
      icon: 'members.png',
      title: 'Members',
      who: 'Superiors',
      summary: 'The list of clan members with their hero level, troop levels and join date. Here you add and remove members and keep their levels up to date.',
      parts: [
        { title: 'The member list', text: 'At the bottom of the page. Search for a name, or click a column title to sort. Under the join date you see **before reset** or **after reset**: did the member join before 17:00 UTC? Click it to change.' },
        { title: '👥 Roster', list: [
          '**➕ Add Member**: add a new member, or a member who comes back (**↩️ Returning member**).',
          '**🚪 Remove Member**: a member who left the clan. Their history is kept with the former members.',
          '**✏️ Change Name**: a member changed their name in the game.'
        ] },
        { title: '📈 Progress', list: [
          '**⚔️ Track Troops**: save the troop levels (G, S, M, E) and the Carter level of a member.',
          '**🦸 Hero Level**: save the hero level. **📋 Batch Entry** lets you enter many members at once.',
          '**📦 Chest Points**: the chest points of every member in the last periods. Green = target reached, orange = within 10%, red = below.'
        ] },
        { title: 'Where are targets, exemptions and logins?', text: 'On the **Admin** page.' }
      ],
      howto: [
        { q: 'A new member joined. What do I do?', steps: [
          'Open **👥 Roster → ➕ Add Member** and choose **🆕 New member**.',
          'Type the player name exactly as in the game, and the join date.',
          'Did they join before 17:00 UTC? Tick **Joined Before Reset**. They then take part in the events of that day.',
          'Click **➕ Add Member**.',
          'Open **📈 Progress → ⚔️ Track Troops** and save their troop levels. Save their hero level on **🦸 Hero Level**.',
          'Should they sign in? Link their Google account on **Admin → 🔐 Access → 🔐 Member Login Accounts**.'
        ] },
        { q: 'A member came back to the clan.', steps: [
          'Open **➕ Add Member** and choose **↩️ Returning member (was here before)**.',
          'Search for them in the list of former members and click **↩️ Restore member**. Their old history and login come back.',
          'Already added them as a new member by mistake? Use **Admin → 🔁 Between clans → 🔗 Link Former Members**.'
        ] },
        { q: 'A member left the clan.', steps: [
          'Open **🚪 Remove Member**.',
          'Choose the member and the date they left. Write the reason if you want.',
          'Click **🚪 Remove Member** and confirm.'
        ] },
        { q: 'A member changed their name in the game.', steps: [
          'Open **✏️ Change Name**.',
          'Choose the member, type the new name and click **✏️ Update Name**.',
          'Do not use **🔀 Move Chests** for this. That only moves chests that were saved under a wrong name.'
        ] }
      ]
    },

    {
      file: 'profiling.html',
      icon: 'profiling.png',
      title: 'Profiling',
      who: 'Superiors',
      summary: 'A score from 0 to 100 for every member, to see who performs well and who needs attention.',
      parts: [
        { title: 'How the score is made', list: [
          '**Target**: how much of the period target the member reached.',
          '**Events**: how well the member did in the events of the last 60 days.',
          '**Consistency**: in how many of the last 5 periods the member had chest points.',
          '**Warnings**: every warning takes 25% off this part.',
          'The weight of each part is shown on the page. A part with nothing to count (for example a new member without events) is left out.'
        ] },
        { title: '🏆 Rankings', text: 'All members from the best to the lowest score. Click a name to see the details.' },
        { title: '👤 Individual', text: 'Choose a member to see their score and every part of it, their chest statistics, the last periods, and their history (**📈 Evolution**, **🦸 Hero Level**, **🛡️ Captains**).' },
        { title: '📉 Missed Norms', text: 'Which targets each member missed, and by how much, in the last 1, 2 or 3 months. **⬇️ CSV** downloads the list.' }
      ],
      howto: [
        { q: 'How do I prepare a talk with a weak member?', steps: [
          'Open **👤 Individual** and choose the member.',
          'Look at **Full Breakdown**: which part has the lowest score?',
          'Open **📉 Missed Norms** and search for the member to see what they missed.',
          'Check the **Warnings** page for their earlier warnings.'
        ] }
      ]
    },

    {
      file: 'warnings.html',
      icon: 'warning.png',
      title: 'Warnings',
      who: 'Superiors',
      summary: 'Give warnings to members and see all earlier warnings.',
      parts: [
        { title: '📋 Overview', text: 'All members who have warnings, with the number of warnings. **🧹** deletes all warnings of a member.' },
        { title: '➕ Issue Warning', text: 'Give a new warning: choose the member and the reason, and write a comment if you want. The warning number is chosen automatically: the next number for that member.' },
        { title: '🎯 Auto-warn Custom Targets', text: 'Gives the warning "Penalty target for chests" to every member who got a penalty target and does not have that warning yet.' },
        { title: '📜 History', text: 'All warnings, newest first. Filter on a member or on a reason. **🗑️** deletes one warning.' }
      ],
      howto: [
        { q: 'How do I give a warning?', steps: [
          'Open **📜 History** and choose the member. See how many warnings they already have.',
          'Open **➕ Issue Warning**.',
          'Choose the member. **Warning #** shows their next number automatically.',
          'Choose the reason and write a short comment.',
          'Click **⚠️ Issue Warning**.'
        ] },
        { q: 'I gave a warning by mistake.', steps: [
          'Open **📜 History** and choose the member.',
          'Click **🗑️** on the wrong warning and confirm. This cannot be undone.'
        ] }
      ]
    },

    {
      file: 'competition.html',
      icon: 'competition.png',
      title: 'Competition',
      who: 'Everyone',
      summary: 'The leaderboard of the Crypt Competition.',
      parts: [
        { title: 'The leaderboard', text: 'Every member who takes part, with their points and valid chests. The top shows the current leader and when the list was last updated.' },
        { title: 'Refresh Leaderboard', text: 'Loads the newest points.' }
      ]
    },

    {
      file: 'calendar.html',
      icon: 'calendar.png',
      title: 'Calendar',
      who: 'Everyone',
      summary: 'The clan events per month.',
      parts: [
        { title: 'The month', text: 'Use **◀ Prev** and **Next ▶** to go to another month. **Today** brings you back to this month.' },
        { title: 'An event', text: 'Click an event to see its date, time and category.' },
        { title: '📋 Upcoming Events', text: 'The events that start soon.' },
        { title: 'Where do the events come from?', text: 'From the clan schedule on **Events → 🗓️ Schedule**.' }
      ]
    },

    {
      file: 'bank.html',
      icon: 'bank.png',
      title: 'Bank',
      who: 'Superiors',
      summary: 'The silver of the clan bank: how much every member has, and every deposit, withdrawal, transfer and penalty.',
      parts: [
        { title: 'Transaction Entry', list: [
          '**Deposit**: a member gives silver to the bank.',
          '**Withdrawal**: a member takes silver out.',
          '**Transfer to member**: silver goes from one member to another.',
          '**Penalty**: a silver penalty. Penalties from events are added here automatically.',
          '**Percentage Fee**: a fee the bank keeps on a deposit. A deposit of 1,000 with 10% fee gives a balance of 900.'
        ] },
        { title: 'Bank Overview', text: '**Total Bank Balance** is all silver in the bank. **Outstanding Debts** is the silver members still owe. **Export Members Owing Silver (CSV)** downloads the list of members who owe silver.' },
        { title: "Members' Balances / Transaction History", text: 'Switch between the balance of every member and the list of all transactions. Use the filters to find a name or a type.' }
      ],
      howto: [
        { q: 'A member deposited silver. What do I do?', steps: [
          'Under **Transaction Entry**, choose the member.',
          'Choose **Deposit** and type the amount. Fill in the fee if the clan uses one.',
          'Leave the date empty for today. Write a remark, for example "repayment".',
          'Click **Submit Transaction**.'
        ] },
        { q: 'I entered a wrong transaction.', steps: [
          'Open **Transaction History** and find the row.',
          'Remove it in **Actions** and enter it again correctly.'
        ] },
        { q: 'Someone who is not a clan member pays or receives silver.', steps: [
          'Type their name in **Other Name** (or **Other Recipient**).',
          'Always use the same spelling. Then all their transactions stay on one row.'
        ] }
      ]
    },

    {
      file: 'admin.html',
      icon: 'admin.png',
      title: 'Admin',
      who: 'Superiors',
      summary: 'The settings of the clan: chest data and corrections, targets and exemptions, members who move between clans, and who may sign in.',
      parts: [
        { title: '📥 Chest data', list: [
          '**🔀 Move Chests**: move chests from one name to the right member, for example chests saved under a name the chesttracker read wrong.',
          '**🔤 OCR Corrections**: words the chesttracker reads wrong, and the correct word. The chesttracker uses them at its next run. This does not change chests that are already saved: move those with **🔀 Move Chests**.',
          '**🛠️ Manage Chest Data**: every chest of the active or previous period. Remove chests that should not count, or correct a wrong chest type, name or level. You can undo this under **Recent removals** and **Recent corrections**.',
          '**➕ Manual Chests** (only the clan leader): add chests the chesttracker missed.'
        ] },
        { title: '🏷️ Rules', list: [
          '**🏷️ Chest Point Values**: how many points each chest is worth. A change counts again for the active period right away.',
          '**🛡️ Exemptions**: members who never get an event penalty, for example utility accounts. You can give dates. **Vacation**: the member still gets penalties, but more of their extra points carry over to the next period, so they can collect points before the holiday.',
          '**🎯 Point Targets**: a member\'s own target for one period. Most targets here are calculated automatically: at every period change a shortfall or a surplus is carried over, and point penalties from events are added. Only change a target if you want to override that, for example a lower target for a new member. Leave it empty to use the normal target. The default target is set here too.'
        ] },
        { title: '🔁 Between clans', list: [
          '**🔗 Link Former Members**: a member who came back and was added as a new member. Link their old history to them.',
          '**🔁 Member Transfers**: a player who moves between the cCc clans. Ask the old clan for their profile, and answer requests from other clans. Nothing is shared until a superior approves it.'
        ] },
        { title: '🔐 Access', list: [
          '**🔐 Member Login Accounts**: link a member to a Google account, so they can sign in and see their profile. One Google account can be linked to several members (alt accounts).',
          '**👑 Superiors** (only the clan leader): who may use the management pages.'
        ] }
      ],
      howto: [
        { q: 'A member goes on holiday.', steps: [
          'Open **🏷️ Rules → 🛡️ Exemptions**.',
          'Find the member. Tick **Listed** and **Vacation**, and fill in the dates of the holiday.',
          'Click **💾 Save Exemptions**.'
        ] },
        { q: 'One member needs a different target.', steps: [
          'Open **🏷️ Rules → 🎯 Point Targets**.',
          'Remember: the carried-over targets are calculated automatically. Only change a target if you want to override it.',
          'Choose the period. Type the target next to the member. Leave it empty to use the normal target.',
          'Click **💾 Save Point Targets**.'
        ] },
        { q: 'How do I move chests from one player to another?', steps: [
          'Open **📥 Chest data → 🔀 Move Chests** and choose the period.',
          'Find the wrong name in **Name in the chests** and choose the member under **Move to member**.',
          'Click **🔀 Move** and confirm. Only the chests of that period move.',
          'Add the wrong spelling to **🔤 OCR Corrections**, so the chesttracker reads it right next time.'
        ] },
        { q: 'Chests that should not count (Inactive Player, wrong chest).', steps: [
          'Open **📥 Chest data → 🛠️ Manage Chest Data** and choose the period.',
          'Use the filters to find the chests. Tick them.',
          'Click **🗑️ Remove selected**, or fill in **Correct to:** and click **✏️ Correct selected**.',
          'A mistake? Put them back under **Recent removals** or **Recent corrections**.'
        ] },
        { q: 'A member wants to sign in to see their profile.', steps: [
          'Open **🔐 Access → 🔐 Member Login Accounts**.',
          'Type their Google e-mail next to their name.',
          'Click **💾 Save Accounts**. They can now sign in and open **My Profile**.'
        ] },
        { q: 'A player comes to us from another cCc clan.', steps: [
          'Add them on **Members → ➕ Add Member** first.',
          'Open **🔁 Between clans → 🔁 Member Transfers**. Under **📨 Ask another clan for a profile**, choose the clan and type their name in that clan.',
          'Click **📨 Send request**.',
          'Wait until a superior of the other clan approves. The request then shows **✅ approved** under **📤 Our requests**.',
          'Click **👁️ View profile** to see their profile.',
          'Under the profile, pick our member at **For our member** and click **⬇️ Copy levels**. Confirm.',
          'This adds their troop and hero levels and their captain history to our records.'
        ] }
      ]
    },

    {
      file: 'myprofile.html',
      icon: 'member_profile.png',
      title: 'My Profile',
      who: 'Every member with a linked account',
      summary: 'Your own page: your profile score, your target progress, point penalties, chest points per category, silver penalties and recent bank transactions.',
      parts: [
        { title: 'Linked accounts', text: 'Do you have more than one account in the game linked to your Google account? Choose which one you see.' },
        { title: 'For members', text: 'Every member whose Google account is linked (Admin → 🔐 Member Login Accounts) can see this page. Send members here when they ask about their points, penalties or bank balance.' }
      ]
    }
  ]
};
