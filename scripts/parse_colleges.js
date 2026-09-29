// Script to parse and validate 461 TNEA colleges from the uploaded document
import fs from 'fs';
import path from 'path';

const rawPages = [
  // Page 1
  `1 1323 A C T College of Engineering and Technology, Nelvoy Village, Pukkathurai Post, Maduranthagam, Chengalpattu District 603107 79
2 1441 A K T Memorial College of Engineering and Technology, Neelamangalam Village, Kallakurichi District 606202 113
3 4937 A R College of Engineering and Technology, Kadayam-Alangulam Road, Therikkumadathoor Post, Tenkasi District 627423 376
4 1436 A R Engineering College, Vadakuchipalayam, Kappiyampuliyur Post, Villupuram District 605601 110
5 3821 A R J College of Engineering and Technology, Mannargudi Taluk, Thiruvarur District 614001 326
6 3801 A V C College of Engineering, Mannampandal Post, Mayiladuthurai, Nagappattinam District 609305 308
7 2636 A V S Engineering College, Military Road, Ammapet, Salem District 636003 203
8 4680 AAA College of Engineering and Technology, Kamarajar Educational Road, Amathur Village, Sivakasi, Virudhunagar District 626005 365
9 1101 Aalim Muhammed Salegh College of Engineering, Muthapudupet, Avadi IAF, Chennai 600055 9
10 1233 Adhi College of Engineering and Technology, Pazhayaseevaram, Madura Sankarapuram Village, Kancheepuram District 631605 57
11 1501 Adhiparasakthi College of Engineering, Kalavai, Ranipet District 632506 121
12 1401 Adhiparasakthi Engineering College, Melmaruvathur, Chengalpattu District 603319 85
13 2601 Adhiyamaan College of Engineering (Autonomous), Hosur, Krishnagiri District 635109 172
14 2744 Adithya Institute of Technology, Kurumbapalayam Village, Coimbatore District 641107 263
15 1316 Agni College of Technology, Old Mahabalipuram Road (OMR), Thalambur Village, Chengalpattu District 603103 72
16 2332 Aishwarya College of Engineering and Technology, Errattaikaradu Paruvachi Post, Anthiyur (Via), Bhavani Taluk, Erode District 638312 153
17 2763 Akshaya College of Engineering and Technology, Kinathukadavu, Coimbatore District 642109 276
18 5901 Alagappa Chettair Government College of Engineering and Technology (Autonomous), Karaikudi, Sivagangai District 630004 443
19 2652 Al-Ameen Engineering College (Autonomous), Karundevan Palayam, Nanjai Uthukuli Post, Erode District 638104 215`,

  // Page 2
  `20 1228 Alpha College of Engineering, Dr. Grace George Nagar, Udayavar Koil Street, Thirumazhisai, Poonamalle, Chennai 602107 53
21 2682 Ambal Professional Group of Institutions, Coimbatore to Trichy Road, K N Puram Post, Palladam Taluk, Tiruppur District 641662 227
22 4972 AMRITA College of Engineering and Technology, Erachakulam Post, Kanyakumari District 629902 403
23 1303 Anand Institute of Higher Technology, Old Mahabalipuram Road (OMR), Kazhipattur, Chengalpattu District 603103 63
24 2733 Angel College of Engineering and Technology, P.K.Palayam, Ugayanur Village, Tirupur District 641 665 254
25 3803 Anjalai Ammal-Mahalingam Engineering College, Kovilvenni, Thiruvarur District 614403 310
26 2025 Anna University Regional Campus - Coimbatore, Maruthamalai Main Road, Navavoor Bharathiyar University Post, Somayampalayam, Coimbatore District 641046 147
27 5010 Anna University Regional Campus - Madurai, Kanyakumari National Highway, Keelakuilkudi, Madurai District 625019 426
28 4020 Anna University Regional Campus - Tirunelveli, Trivandrum Road, Palayamkottai, Tirunelveli District 627007 355
29 3849 Annai College of Engineering and Technology, Kovilacheri, Kumbakonam, Thanjavur District 612503 341
30 2602 Annai Mathammal Sheela Enginereing College, Erumapatty Post, Namakkal District 637013 173
31 1137 Annai Mira College of Engineering and Technology, Arcot Road, Arappakkam Village, Walaja Taulk, Ranipet District 632 517 30
32 1402 Annai Terasa College of Engineering, Thirunavalur, Kallakkurichi District 607204 86
33 4999 Annai Vailankanni College of Engineering, Pothaiyadi Salai, Pottalkulam, Azhagappapuram, Kanyakumari District 629401 423
34 1133 Annai Veilankannis College of Engineering, Gandhi Road, Nedungundram, Chennai 600048 29
35 0005 Annamalai University Faculty of Engineering and Technology,Annamalai nagar,Cuddalore 4
36 1524 Annamalaiar College of Engineering, Modaiyur Village, Polur Taluk, Thiruvannamalai District 606902 139
37 2648 Annapoorana Engineering College, Sankari Main Road, NH-47, Periaseeragapadi, Salem District 636308 212
38 1230 Apollo Engineering College, Mevaloorkuppam, Valarpuram Post, Sriperumpudur, Kancheepuram District 602105 55
39 3804 Arasu Engineering College, Chennai Main Road, Kumbakonam, Thanjavur District 612501 311
40 3461 Arifa Institute of Technology(Formerly Haji sheik Ismail Engineering College), Esanoor, Keelaiyur Post, Thirukkuvalai Taluk, Nagapattinam District 611103 297`,

  // Page 3
  `41 1201 Arignar Anna Institute of Science and Technology, Pennalur, Sriperumpudur Taluk, Kancheepuram District 602105 35
42 3462 Ariyalur Engineering College, NH-227, Trichy-Chithambaram NH, Karuppur-Senapathy Post, Ariyalur District 621707 298
43 2367 Arjun College of Technology, Chettiyakkapalayam, Kinathukadavu, Coimbatore District 642120 169
44 1503 Arulmigu Meenakshi Amman College of Engineering, Vadamavandal,Thiruvannamalai District 604410 122
45 2356 Arulmurugan College of Engineering, Karvazhi Road, Thennilai Post, Karur District 639206 165
46 4944 Arunachala College of Engineering for Women, Thanka Gardens, Manavilai, Vellichanthai, Nagercoil, Kanyakumari District 629203 380
47 1504 Arunai Engineering College, Mathur, Thiruvannamalai District 606603 123
48 1423 Asan Memorial College of Engineering and Technology,Chengalpattu 603 001. 101
49 2338 Asian College of Engineering and Technology, Asian College Road, Kondayampalayam, Near Saravanampatti, Coimbatore District 641110 154
50 3855 As-Salam College of Engineering and Technology, Thirumangalakudi, Aduthurai, Thiruvidaimaruthur, Thanjavur District 612102 345
51 2347 AVS College of Technology, Attur Main Road, Near AVS College of Arts & Science, Chinnagoundapuram, Salem District 636106 160
52 2702 Bannari Amman Institute of Technology (Autonomous), Sathyamanagalam, Erode District 638401 229
53 4992 Bethlahem Institute of Engineering, Karungal, Kanyakumari District 629157 417
54 1102 BHAJARANG ENGINEERING COLLEGE,AYATHUR VILLAGE, VEPPAMPATTU(R.S),THIRUVALLUR 10
55 5902 Bharath Niketan Engineering College, Thimmarasanaickanoor, Aundipatti, Theni District 625536 444
56 1519 Bharathidasan Engineering College, Nattrampalli Post, Thiruppathur District 635854 135
57 2643 Bharathiyar Institute of Engineering for Women, Deviayakurichi, Attur Taluk, Salem District 636112 209
58 2656 Builders engineering college, Nathakadaiyur, Erode Road, Palayakottai Village, Kangeyam, Tiruppur District 638108 217
59 1505 C Abdul Hakeem College of Engineering and Technology, Melvisharam, Ranipet District 632509 124
60 3425 C K College of Engineering and Technology, Chellangkuppam, Cuddalore District 607003 290
61 2772 C M S College of Engineering and Technology, Appachigoundenpathy, Kumittipatti, Coimbatore District 641105 281`,

  // Page 4
  `62 2635 C M S College of Engineering, Emapuram Post, Namakkal District 637003 202
63 2705 C S I College of Engineering, Ketti, The Nilgiris 643215 231
64 4952 C S I Institute of Technology, Thovalai, Kanyakumari District 629302 385
65 3841 CARE College of Engineering, Thayanoor Village, Thayanoor Village, Kuttappatti, Srirangam Taluk, Tiruchirappalli District 620009 334
66 4953 CAPE Institute of Technology, Levingipuram, Tirunelveli District 627114 386
67 5012 Central Electrochemical Research Institute CECRI), Karaikudi, Sivagangai District 630006 427
68 1321 Central Institute of Plastics Engineering and Technology (CIPET), Guindy, Chennai 600032 77
69 1444 Chendu College of Engineering & Technology, Zamin Endathur Village, Madurantakam Taluk, Chengalpattu District 603331 115
70 3926 CHENDURAN COLLEGE OF ENGINEERING & TECHNOLOGY, THIRUMAYAM PUDUKOTTAI - 622507 354
71 1399 Chennai Institute of Technology, Puduper Village, Nandambakkam Post, Kundrathur, Chennai 600069 84
72 2355 Cheran College of Engineering, Karur-Coimbatore Main Road, NH-67, K.Paramathi Post, Aravakurichi Taluk, Karur District 639111 164
73 2630 Chettinad College of Engineering and Technology, NH-67, Trichy Main Road, Puliyur C F, Karur District 639114 197
74 2650 Christ the King Engineering College, Cecilia Gardens, Chikkarampalayam Village, Coimbatore District 641104 213
75 5703 Christian College of Engineering and Technology, Oddanchatram, Dindigul District 624619 436
76 2704 Coimbatore Institute of Engineering and Technolgoy (Autonomous), Narasipuram Post, Coimbatore District 641109 230
77 2007 Coimbatore Institute of Technology (Autonomous), Civil Aerodrome Post, Coimbatore District 641014 146
78 1202 D M I College of Engineering, Palanchoor, Nazrethpet, Chennai 602103 36
79 4946 D M I Engineering College, Aralvaimozhi Village, Thovalai, Kanyakumari District 629301 382
80 1424 Dhaanish Ahmed College of Engineering, Padappai, Chennai 601301 102
81 2349 Dhaanish Ahmed Institute of Technology, Pichanur Post, (Near K G Chavadi), Coimbatore District 641105 161
82 1405 Dhanalakshmi College of Engineering, Manimangalam, Chennai 601301 87
83 3805 Dhanalakshmi Srinivasan Engineering College (Autonomous), Thuraiyur Road, Perambalur District 621212 312`,

  // Page 5
  `84 1322 Dhanalakshmi Srinivasan College of Engineering and Technology, East Coast Road, Poonjeri, Chennai 603104 78
85 2743 Dhanalakshmi Srinivasan College of Engineering, NH47, Palakkad Main Road, Navakkarai Post, Near Nandhi Temple, Coimbatore District 641105 262
86 3458 Dhanalakshmi Srinivasan Institute of Research and Technology, NH-45, Trichy-Chennai Main Road, Siruvachur, Perambalur District 621113 294
87 3459 Dhanalakshmi Srinivasan Institute of Technology, Samayapuram, Chennai-Trichy Main Road, Tiruchirappalli District 621112 295
88 2345 Dhirajlal Gandhi College of Technology, Sikkanampatty, (Opp. to Airport), Omalur Taluk, Salem District 636309 158
89 4975 Dr. G U Pope College of Engineering, Sawyerpuram, Thoothukudi District 628251 406
90 2706 Dr. Mahalingam College of Engineering and Technology (Autonomous), Mackinaickenpatti Post, Pollachi Taluk, Coimbatore District 642003 232
91 2736 Dr. N G P Institute of Technology, Kalapatti Road, Coimbatore District 641035 257
92 2662 Dr. Nagarathinams College of Engineering, Anadhagoundam Palayam, Minakkal Post, Rasipuram, Namakkal District 637505 222
93 3822 Dr. Navalar Nedunchezhian College of Engineering, Tholudur, Cuddalore District 606303 327
94 4954 Dr. Sivanthi Aditanar College of Engineering, Tiruchendur, Thoothukudi District 628215 387
95 3806 E G S Pillay Engineering College (Autonomous), Nagapattinam District 611002 313
96 2749 EASA College of Engineering and Technology, NH-47, Coimbatore-Palakkad Main Road, Navakarai Post, Coimbatore District 641105 267
97 1304 Easwari Engineering College (Autonomous), Ramapuram, Chennai 600089 64
98 4980 Einstein College of Engineering, Seethaparpanallur, Tirunelveli District 627012 411
99 2621 Er. Perumal Manimekalai College of Engineering, Near Koneripalli, Hosur, Krishnagiri District 635117 189
100 2707 Erode Sengunthar Engineering College (Autonomous), Thudupathi Post, Erode District 638057 233
101 2664 Excel College of Engineering and Technology, Pallakapalayam, Sankari West Post, Namakkal District 637303 223
102 2634 Excel Engineering College (Autonomous), Pallakkapalayam, Sankari West Post, Namakkal District 637303 201
103 5935 Fatima Michael College of Engineering & Technology, Sengottai Village, Sivagangai Main Road, Madurai District 625020 457
104 4955 Francis Xavier Engineering College (Autonomous), Vannarpettai, Tirunelveli District 627003 388`,

  // Page 6
  `105 1407 G K M College of Engineering and Technology, Alappakkam-Mappedu Road, Chennai 600063 88
106 1507 Ganadipathy Tulsi's Jain Engineering College, Kaniyambadi, Vellore District 632102 125
107 5924 Ganapathy Chettiar College of Engineering and Technology, Melakavanur Post, Paramakudi, Ramanathapuram District 623706 455
108 2341 Ganesh College of Engineering, Attur Main Road, Mettupatti, Salem District 636111 155
109 1523 Global Institute of Engineering and Technology, Bangalore-Chennai Highway, Melvisharam, Walajah Taluk, Ranipet District 632506 138
110 2624 Gnanamani College of Technology, Pachal Post, Namakkal District 637018 192
111 1123 Gojan School of Business and Technology, Alamathi, Chennai 600062 23
112 4686 GOOD SHEPHERD COLLEGE OF ENGINEERING AND TECHNOLOGY, MARUTHAMPARAI, KANYAKUMARI 366
113 2603 Government College of Engineering (Autonomous), Bargur, Krishnagiri District 635104 174
114 2615 Government College of Engineering (Autonomous), Karuppur, Salem District 636011 184
115 2369 Government College of Engineering, Chettikkarai Post, Dharmapuri District 635704 170
116 3464 Government College of Engineering, Gandarvakottai Road, Sengipatti, Thanjavur District 613402 299
117 5009 Government College of Engineering, Melachokkanathapuram, Bodinayakkanur, Theni District 625582 425
118 3465 Government College of Engineering, Srirangam, Sethurappatti, Tiruchirappalli District 620012 300
119 4974 Government College of Engineering, Tirunelveli District 627007 405
120 2005 Government College of Technology (Autonomous), Thadagam Road, Coimbatore District 641013 144
121 4931 Grace College of Engineering, Chandy Nagar, Mullakkadu, Thoothukudi District 628005 372
122 1238 GRT Institute of Engineering and Technology, GRT Mahalakshmi Nagar, Chennai-Tirupathi Highway, Tiruttani Taluk, Thiruvallur District 631209 59
123 2740 Hindustan Institute of Technology (Autonomous), Othakkalmandapam, Coimbatore District 641032 260
124 2708 Hindusthan College of Engineering and Technology (Autonomous), Othakkalmandapam Post, Coimbatore District 641032 234
125 4934 Holy Cross Engineering College, Vagaikulam, Sri Mulakarai, Srivaikuntam, Thoothukudi District 628851 375`,

  // Page 7
  `126 2362 HOSUR INSTITUTE OF TECH AND SCIENCE, Errandapalli Village, Hosur Taluk, Krishnagiri District 168
127 1408 I F E T College of Engineering (Autonomous), Gangarampalayam, Villupuram District 605108 89
128 1605 Idhaya Engineering College for Women, Chinnasalem, Kallakkurichi District 606201 143
129 3845 Imayam College of Engineering, Kannanur, Thuraiyur, Tiruchirappalli District 621206 337
130 4932 Immanuel Arasar J J College of Engineering, Anappara, Edavilagam, Nattalam, Kanyakumari District 629195 373
131 2343 Indian Institute of Handloom Technology, Foulke's Compound, Thillai Nagar, Salem District 636001 157
132 1229 Indira Institute of Engineering and Technology, VGR Gardens, Pandur, Thiruvallur District 631203 54
133 3831 Indra Ganesan College of Engineering, Madurai Main Road, Manikandam, Tiruchirappalli District 620012 332
134 4976 Infant Jesus College of Engineering, Thoothukudi Highway (NH7/A), Thoothukudi District 628851 407
135 2732 INFO Institute of Engineering, Sarkar Samakulam, Coimbatore District 641107 253
136 2709 Institute of Road and Transport Technology, Vasavi College Post, Erode District 638316 235
137 2769 J C T College of Engineering and Technology, Pichanur, Coimbatore District 641105 279
138 3807 J J College of Engineering and Technology, Poolankulathupatti Post, Thiruchirappalli District 620009 314
139 2758 J K K Muniraja College of Technology, T N Palayam, Gobi Taluk, Erode District 638506 273
140 2647 J K K Nataraja College of Engineering and Technology, Komarapalayam Amani, Thattankuttai Panchayat, Namakkal District 638183 211
141 1126 J N N Institute of Engineering, Ushaa Garden, Kannigaipair Village, Uthukottai Taluk, Thiruvallur District 601102 26
142 4994 J P College of Engineering, College Road, Ayakudy, Tenkasi Taluk, Tenkasi District 627852 419
143 1435 Jagannath Institute of Technology, Thandalam Village, Thiruporur, Kancheepuram District 603110 109
144 2651 Jai Shriram Engineering College, Dharapuram Road, Avinashi Palayam, Tiruppur District 638660 214
145 5537 Jainee College of Engineering and Technology, Dindigul-Theni Main Road (Near Vakkampatti), Dindigul District 624303 435
146 2350 Jairupaa College of Engineering, Thottiapalayam, Kathankanni Post, Kangayam, Tiruppur District 641 604 162`,

  // Page 8
  `147 2762 Jansons Institute of Technology, Karumathampatty, Somaur, Coimbatore District 641659 275
148 1447 Jawahar Engineering College, Kaveri Rangan Nagar, Saligramam, Chennai 600093 117
149 1221 Jaya College of Engineering and Technology, Parivakkam, Poonamallee, Chennai 600056 49
150 1106 Jaya Engineering College, Thirunindravur, Chennai 602024 11
151 1107 Jaya Institute of Technology, Kanchipadi Post, Thiruvallur-Tiruttani NH Road, Thiruvallur District 631204 12
152 1416 Jaya Sakthi Engineering College, Thirunindravur, Chennai 602024 96
153 2640 Jayalakshmi Institute of Technology, Thoppur, Dharmapuri District 635352 206
154 2606 Jayam College of Engineering and Technology, Nallanur Post, Dharmapuri District 636813 175
155 4956 Jayamatha Engineering College, Aralvaimozhi, Kanyakumari District - 629301 389
156 4957 Jayaraj Annapackiam CSI College of Engineering, Nazareth, Thoothukudi District 628617 390
157 3808 Jayaram College of Engineering and Technology , Pagalavadi Post, Tiruchirappalli District 621014 315
158 1140 Jeppiaar Institute of Technology,kunnam Village,Sriperumpudur Taulk,Kancheepuram District 631604 31
159 1320 Jeppiaar SRR Engineering College, Old Mahabalipuram Road, Chengalpattu District 603103 76
160 1306 Jeppiar Engineering College, Old Mahabalipuram Road (OMR), Chennai 600119 65
161 1307 Jerusalem College of Engineering (Autonomous), Narayanapuram, Pallikaranai, Chennai 600 100 66
162 1311 K C G College of Technology, Karappakkam, Chennai 600096 69
163 5904 K L N College of Engineering (Autonomous), Pottapalayam, Sivagangai District 630611 445
164 2764 K P R Institute of Engineering and Technology (Autonomous), Kollupalayam Village, Arasur Panchayat, Coimbatore District 641407 277
165 3830 K Ramakrishnan College of Engineering (Autonomous), Kariyamanickam Road, Samayapuram, Manachanallur Taluk, Tiruchirappalli District 621112 331
166 3701 K Ramakrishnan College of Technology, Kariyamanickam Road, Samayapuram, Manachanallur Taluk, Tiruchirappalli District 621112 302
167 3456 K S K College of Engineering and Technology, Thanjavur Main Road, Darasuram, Kumbakonam, Thanjavur District 612702 293`,

  // Page 9
  `168 2613 K S R College of Engineering (Autonomous), Tiruchengode, Namakkal District 637215 182
169 2328 K S R Institute for Engineering and Technology, Thokkavadi, Namakkal District 637215 151
170 2607 K S Rangasamy College of Technology (Autonomous), Tiruchengode, Namakkal District 637215 176
171 2750 KIT-Kalaignar Karunanidhi Institute of Technology (Autonomous), Kannampalayam, Coimbatore District 641402 268
172 4959 Kamaraj College of Engineering and Technology (Autonomous), Virudhunagar District 626001 391
173 1208 KANCHI PALLVAN ENGINEERING COLLEGE, Kancheepuram District 39
174 5533 Karaikudi Institute of Technology, KIT & KIM Technical Campus, Keeranipatti, Thalakkuvur, Karaikudi, Sivagangai District 630307 433
175 2710 Karpagam College of Engineering (Autonomous), Othakkalmandapam, Coimbatore District 641032 236
176 2735 Karpagam Institute of Technology, Seerapalayam Village, L&T By pass Road, Coimbatore District 641021 256
177 1409 Karpagavinayaga College of Engineering and Technology, Palayanoor Post, Maduranthagam Taluk, Chengalpattu District 603308 90
178 2745 Kathir College of Engineering, Neelambur, Avinashi Road, Coimbatore District 641062 264
179 2751 KGISL Institute of Technology, KGISL Campus, Thudiyalur Road, Saravanampatti, Coimbatore District 641035 269
180 2631 King College of Technology, Nallur, N Pudupatty Post, Namakkal District 637020 198
181 3905 Kings College of Engineering, Punalkulam, Pudukkottai District 613303 349
182 1207 Kings Engineering College, Sriperumpudur Taluk, Kancheepuram District 602105 38
183 1520 Kingston Engineering College, Chithoor Main Road, Christianpet Village, Katpadi Taluk, Vellore District 632059 136
184 2653 Knowledge Institute of Technology, KIOT Campus, Kakapalayam Post, Salem District 637504 216
185 2711 Kongu Engineering College (Autonomous), Perundurai, Erode District 638052 237
186 3826 Kongunadu College of Engineering and Technology (Autonomous), Tholurpatti, Thottiyam, Tiruchirappalli District 621215 329
187 3410 Krishnaswamy Collge of Engineering and Technology, S Kumarapuram, Cuddalore District 607109 289
188 2712 Kumaraguru College of Technology (Autonomous), Chinnavedampatti Post, Coimbatore District 641006 238
189 3809 Kurinji College of Engineering and Technology, Manapparai, Tiruchirappalli District 621307 316`,

  // Page 10
  `190 5990 Latha Mathavan Engineering College, Kidaripatti Post, Alagarkoil (Via), Melur Taluk, Madurai District 625301 461
191 4983 Lord Jegannath College of Engineering and Technology, Kumarapuram, Thoppur Post, Kanyakumari District 629402 414
192 1205 Lord Venkateshwara Engineering College, Walajabad Post, Kancheepuram District 631605 37
193 4677 Lourdes Mount College of Engineering and Technology, Marthandam-Karungal Road, Chundavilai, Mullanganavilai, Nattalam Post, Kanyakumari District 629195 363
194 4993 Loyola Institute of Technology and Science, Loyola Nagar, P B No.2, Thovalai, Kanyakumari District 629302 418
195 1225 Loyola Institute of Technology, Mevaloorkuppam, B Village, Palanchoor, Nazarethpet Post, Chennai 600123 51
196 1450 Loyola-ICAM College of Engineering and Technology, Loyola College Campus, Nungambakkam, Chennai 600034 119
197 4929 M E T Engineering College, Mogals Garden, Thovalai Village, Aralvaimozhi Town Panchayat, Thovalai, Kanyakumari District 629304 371
198 3811 M I E T Engineering College, Trichy-Pudukkottai Road, Tiruchirappalli District 620007 318
199 2608 M Kumarasamy College of Engineering (Autonomous), Thalavapalayam, Karur District 639113 177
200 3923 M N S K College of Engineering, Vallathirakkottai Post, Pudukkottai District 622305 353
201 2713 M P Nachimuthu M Jagannathan Engineering College, Chennimalai, Erode District 638112 239
202 3843 M R K Institute of Technology, Nattarmangalam Village, Kattumannarkoil, Cuddalore District 608306 335
203 3829 M.A.M. College of Engineering and Technology, Trichy-Chennai Trunk Road, Siruganur, Tiruchirappalli District 621105 330
204 3810 M.A.M. College of Engineering, Siruganur, Tiruchirappalli District 621105 317
205 3786 M.A.M. School of Engineering, Siruganur, Tiruchirappalli District 621105 306
206 1411 Madha Engineering College, Kundrathur, Chennai 600069 91
207 1243 Madha Institute of Engineering and Technology, Erandamkattalai Village, Sadhananthapuram, Thandalam Post, Chennai 602101 61
208 5842 Madurai Institute of Engineering & Technology, Pottapalayam Village, Manamadurai Taluk, Sivagangai District 630611 439
209 1430 Maha Bharathi Engineering College, A Vasudevanur, Chinnasalem, Kallakurichi District 606201 105
210 4998 Mahakavi Bharathiyar College of Engineering and Technology, Vasudevanallur, Tenkasi District 627758 422`,

  // Page 11
  `211 3403 Mahalakshmi Engineering College, Trichy-Salem Highways, (Near No.1 Tollgate), Melpathu, Siruganbur Post, Tiruchirappalli District 621213 288
212 3854 Mahath Amma Institute of Engineering and Technology (MIET), Ariyur, Annavasal Road, Illupur Taluk, Pudukkottai District 622101 344
213 2623 Mahendra College of Engineering, Attur Road, Minnampalli, Valapady, Salem District 636106 191
214 2609 Mahendra Engineering College (Autonomous), Mahendhirapuri, Mallasamudram, Namakkal District 637503 178
215 2638 Mahendra Engineering College for Women, Kumaramangalam, Namakkal District 637205 204
216 2665 Mahendra Institute of Engineering and Technology, Mahendrapuri, Mallasamudram, Namakkal District 637503 224
217 2632 Mahendra Institute of Technology (Autonomous), Mahendhirapuri, Mallasamudram, Namakkal District 637503 199
218 1412 Mailam Engineering College, Mailam, Villupuram District 604304 92
219 5536 Mangayarkarasi College of Engineering, First Street, Mangayarkarasi Nagar, Paravai, Madurai District 625402 434
220 4928 MAR Ephraem College of Engineering & Technology, Malankara Hills, Elavuvillai, Marthandam, Kanyakumari District 629171 370
221 4927 Maria College of Engineering and Technology, Attoor Puliyamoodu Junction, Thiruvattar Post, Kanyakumari District 629177 369
222 4984 Marthandam College of Engineering & Technology, Kuttakuzhi, Veeyanoor Post, Kanyakumari District 629177 415
223 1509 Meenakshi College of Engineering, Vembuliamman Koil Street, K K Nagar (West), Chennai 600078 126
224 3857 Meenakshi Ramaswamy Engineering College, Trichy Main Road, Thathanur, Udayarpalayam, Ariyalur District 621804 346
225 1309 Meenakshi Sundararajan Engineering College, Kodambakkam, Chennai 600024 67
226 4960 Mepco Schlenk Engineering College (Autonomous), Sivakasi, Virudhunagar District 626005 392
227 1310 Misrimal Navajee Munoth Jain Engineering College, Rajiv Gandhi Salai (OMR), Thorappakkam, Chennai 600096 68
228 1301 Mohamed Sathak A J College of Engineering, Old Mahabalipuram Road (OMR), Egattur, Chengalpattu District 603103 62
229 5907 Mohamed Sathak Engineering College, Kilakarai, Ramanathapuram District 623806 446
230 3812 Mookambigai College of Engineering, Keeranur, Pudukkottai District 622502 319
231 3846 Mother Terasa College of Engineering and Technology, Mettusalai Post and Taluk, Pudukkottai District 622102 338`,

  // Page 12
  `232 3908 Mount Zion College of Engineering and Technology, Pilivalam Post, Pudukkottai District 622507 350
233 2314 Muthayammal College of Engineering, Kakkaveri Post, Namakkal District 637408 149
234 2610 Muthayammal Engineering College (Autonomous), Rasipuram, Namakkal District 637408 179
235 5832 N P R College of Engineering and Technology, Natham, Dindigul District 624003 438
236 2327 N S N College of Engineering and Technology, Karur-Madurai NH7, Manalmedu, Karur District 639003 150
237 5865 Nadar Saraswathi College of Engineering and Technology, Vadupudupatti, Annanji Post, Theni District 625531 442
238 2752 Nandha College of Technology, Pitchandampalayam Post, Erode District 638052 270
239 2715 Nandha Engineering College (Autonomous), Pitchandampalayam Post, Erode District 638052 240
240 2639 Narasus Sarathy Institute of Technology, Poosaripatty Village, Omalur Taluk, Salem District 636305 205
241 4977 Narayanaguru College of Engineering, Manjalumoodu, Kanyakumari District 629151 408
242 4962 National Engineering College (Autonomous), Kovilpatti, Thoothukudi District 628503 394
243 2729 Nehru Institute of Engineering and Technology, Thirumalayampalayam Post, Coimbatore District 641105 251
244 2755 Nehru Institute of Technology, Thirumalayampalayam Post, Coimbatore District 641105 272
245 4961 Nellai College of Engineering, Maruthakulam Post, Tirunelveli District 627151 393
246 3466 Nelliandavar Institute of Technology, Nerunjikorai Village, Pudhupalayam, Ariyalur Taluk, Ariyalur District 621704 301
247 1431 New Prince Shri Bhavani College of Engineering and Technology, Vengaivasal Main Road, Gowriwakkam, Chennai 600073 106
248 3782 OASYS Institute of Technology , Pulivalam Village, Musiri Taluk, Tiruchirappalli District 626001 305
249 1529 Oxford College of Engineering, Venmani Village, Karaipoondi Post, Polur Taluk, Thiruvannamalai District 606803 142
250 3813 Oxford Engineering College, Pirattiyur(W), Tiruchirappalli District 620009 320
251 2741 P A College of Engineering and Technology (Autonomous), Palladam Road, Pollachi, Coimbatore District 642002 261
252 1222 P B College of Engineering, Irungkattukottai, Sriperumpudur Taluk, Kancheepuram District 602105 50
253 2612 P G P College of Engineering and Technology, Paramathi Post, Namakkal District 637207 181`,

  // Page 13
  `254 1125 P M R Engineering College, Adayalampattu, Maduravoyal , Vanagaram, Chennai 600095 25
255 2753 P P G Institute of Technology, Vilankurichi Village, Coimbatore District 641035 271
256 3814 P R Engineering College, Vallam, Thanjavur District 613403 321
257 5910 P S N A Colllege of Engineering and Technology, Dindigul District 624622 447
258 4964 P S N College of Engineering and Technology (Autonomous), Melathediyoor, Tirunelveli Dstrict 627152 395
259 4989 P S N Engineering College, Melathediyoor, Tirunelveli District 627152 416
260 4949 P S N Institute of Technology & Science, Melathediyoor, Tirunelveli District 627152 384
261 4965 P S R Engineering College (Autonomous), Appayanaickenpatti, Sevalpatti, Virudhunagar District 626140 396
262 4995 P S R Rengasamy College of Engineering for Women, Appayanaickenpatti, Sevalpatti, Virudhunagar District 626140 420
263 2642 P S V College of Engineeering and Technology, Mittapalli, Balinayanapalli Post, Elathagiri, Krishnagiri District 635108 208
264 1226 P T Lee Chengalvaraya Naicker College of Engineering and Technology, Oovery, Veliyur Post, Kancheepuram District 631 502 52
265 5911 P T R College of Engineering and Technology, Austinpatty Post, Madurai District 625008 448
266 2628 Paavai College of Engineering, NH-7, Pachal Post, Namakkal District 637018 195
267 2657 Paavai College of Technology, NH-7, Pachal Post, Namakkal District 637018 218
268 2611 Paavai Engineering College (Autonomous) , NH-7, Pachal Post, Namakkal District 637018 180
269 1209 Pallavan College of Engineering, Thimmasamudram, Kancheepuram District 631502 40
270 5912 Pandian Saraswathi Yadav Engineering College, Thirumansolai Post, Sivagangai District 630 561 449
271 1210 Panimalar Engineering College, Nazarethpet, Poonamallee, Chennai 602103 41
272 1231 Panimalar Institute of Technology, Nazarethpet, Poonamallee, Chennai 602103 56
273 3833 Parisutham Institute of Technology and Science, Ring Road, Nanjikottai, Thanjavur District 613006 333
274 2716 Park College of Engineering and Technology, Kaniyur, Coimbatore District 641659 241
275 3815 Pavendhar Bharathidasan College of Engineering and Technology, Pudukkottai Main Road, Tiruchirappalli District 620024 322`,

  // Page 14
  `276 1452 PERI Institute of Technology, Mannivakkam, West Tambaram, Chennai 600048 120
277 4966 PET Engineering College, Vallioor Post, Tirunelveli District 627117 397
278 1525 Podhigai College of Engineering and Technology, Vinayakapuram, Adiyur Post, Tirupattur District 635601 140
279 2354 Pollachi Institute of Engineering and Technology, Main Road, Poosaripatti, Pollachi Taluk, Coimbatore District 642205 163
280 4981 Ponjesly College of Engineering, Vettornimadam Post, Nagercoil, Kanyakumari District 629003 412
281 1110 Prathyusha Engineering college, Aranvoyalkuppam, Thiruvallur District 602025 13
282 1442 Prince Dr. K Vasudevan College of Engineering and Technology, Medavakkam-Mambakkam Road, Ponmar, Chennai 600048 114
283 1414 Prince Shri Venkateshwara Padmavathy Enginering College, Ponmar, Chennai 600048 94
284 1510 Priyadarshini Engineering College, Vaniyambadi Post, Thiruppattur District 635751 127
285 2006 PSG College of Technology (Autonomous), Peelamedu, Coimbatore District 641004 145
286 2377 PSG Institute of Technology and Applied Research, Avinashi Road, Neelambur, Coimbatore 641062 171
287 1112 R M D Engineering College, Kavaraipettai, Gummidipoondi, Thiruvallur District 601206 14
288 1128 R M K College of Engineering and Technology, Puduvoyal, Gummidipoondi Taluk, Thiruvallur District 601206 28
289 1113 R M K Engineering College (Autonomous), Kavaraipettai, Gummidipoondi, Thiruvallur District 601206 15
290 2731 R V S College of Engineering and Technology, Kannampalayam, Sulur, Coimbatore District 641402 252
291 5913 R V S College of Engineering, N Paraipatti Post, Dindigul District 624005 450
292 5862 R V S Educational Trust's Groups of Institutions (Integrated Campus), N Paraipatti Post, Vedasandur Taluk, Dindigul District 624005 441
293 1141 R V S Padmavathy College of Engineering and Technology, Senthil Pakkam Village, Roshanagaram Post, Madarapakkam Via, Gummidipoondi Taluk, Thiruvallur District 601202 32
294 2776 R V S Technical Campus-Coimbatore, Kumaran Kottam Campus, Kannampalayam, Sulur, Coimbatore District 641 402 282
295 4973 Rajas Engineering College , Vadakkangulam, Tirunelveli District 627116 404
296 1211 Rajalakshmi Engineering College (Autonomous), Thandalam, Sriperumpudur Taluk, Kancheepuram District 602105 42`,

  // Page 15
  `297 1432 Rajalakshmi Institute of Technology, Irulapalayam, Kuthampakkam Post, Kancheepuram District 602107 107
298 4948 Rajas Institute of Technology , Ozhuginasery, Nagercoil, Kanyakumari District 629001 383
299 1212 Rajiv Gandhi College of Engineering, Nemili, Sriperumpudur Taluk, Kancheepuram District 602105 43
300 4678 Ramco Institute of Technology, North venganallur Village, Krishnapuram Panchayat, Rajapalayam, Virudhunagar District 626117 364
301 1511 Ranippettai Engineering College, Thenkadappanthangal, Ranipet District 632513 128
302 2329 Rathinam Technical Campus, Pollachi Road, Eachanari, Coimbatore District 641021 152
303 4676 Renganayagi Varatharaj College of Engineering, Salvarpatti, Sivakasi, Virudhunagar District 626128 362
304 3847 Roever College of Engineering and Technology, Elambalur, Perambalur District 621212 339
305 3817 Roever Engineering College, Elambalur, Perambalur District 621212 323
306 4670 Rohini College of Engineering & Technology, Anjugramam-Kanyakumari Main Road, Palkulam, Variyoor Post, Kanyakumari District 629401 359
307 1437 Rrase College of Engineering, Padappai, Chennai 601301 111
308 1114 S A Engineering College (Autonomous), Thiruverkadu, Chennai 600077 16
309 1512 S K P Engineering College, Thiruvannamalai District 606611 129
310 1213 S K R Engineering College, Poonamallee, Chennai 600123 44
311 2734 S N S College of Engineering (Autonomous), Sathy Main Road, Kurumbapalayam Post, Coimbatore District 641107 255
312 2726 S N S College of Technology (Autonomous), Kalappatti Post, Coimbatore District 641035 249
313 2614 S S M College of Engineering, Komarapalayam, Namakkal District 638183 183
314 4967 S Veerasamy Chettiar College of Engineering and Technology, Puliangudi Post, Tenkasi District 627855 398
315 5915 SACS-M A V M M Engineering College, Kidaripatty Post, Madurai District 625001 452
316 2659 Salem College of Engineering and Technology, Salem-Attur Main Road, NH-68, Mettupatty Perumapalayam, Salem District 636111 220
317 1124 SAMS College of Engineering and Technology, Panappakkam, Chennai-Tirupathi Road, Uthukkottai Taluk, Thiruvallur District 601102 24`,

  // Page 16
  `318 2616 Sapthagiri College of Engineering, Periyanahalli Post, Dharmapuri District 635205 185
319 3819 Saranathan College of Engineering, Panjappur, Tiruchirappalli District 620012 324
320 1449 Saraswathy College of Engineering and Technology, NH-45, Main Road, Olakkur, Tindivanam Taluk, Villupuram District 604307 118
321 4968 Sardar Raja College of Engineering, Alangulam, Tenkasi District 627808 399
322 2717 Sasurie College of Engineering, Vijayamangalam, Tiruppur District 638056 242
323 4943 Satyam College of Engineering & Technology, Kannappannallur, Aralvaimozhi, Kanyakumari District 629301 379
324 1216 Saveetha Engineering College (Autonomous), Thandalam, Sriperumpudur Taluk, Kancheepuram District 602105 45
325 5930 SBM College of Engineering and Technology, Thamaraipady, T N Paraipatti Pirivu, Dindigul District 624005 456
326 4969 SCAD College of Engineering and Technology, Cheranmahadevi, Tirunelveli District 627414 400
327 2627 Selvam College of Technology, Pappanaickenpatti Post, Namakkal District 637003 194
328 3859 Sembodai Rukmani Varatharajan Engineering College, Sembodai Village, Vedaraniam, Nagappattinam District 614820 347
329 2629 Sengunthar College of Engineering, Tiruchengode, Namakkal District 637205 196
330 2617 Sengunthar Engineering College (Autonomous), Tiruchengode, Namakkal District 637205 186
331 4917 Sethu Institute of Technology (Autonomous), Kariapatti Post, Virudhunagar District 626106 368
332 3918 Shanmuganathan Engineering College, Pillivalam Post, Pudukkottai District 622507 351
333 3844 Shivani Engineering College, Ammapettai, Srirangam, Tiruchirappalli District 620009 336
334 1313 Shree Motilal Kanhaiyalal (SMK)Fomra Institute of Technology, Old Mahabalipuram Road (OMR), Kelambakkam, Chengalpattu District 603103 70
335 2346 Shree Sathyam College of Engineering and Technology, NH-47, Manjakkalpatti, Kuppanur Post, Sankari Taluk, Salem District 637301 159
336 2747 Shree Venkateshwara Hi-Tech Engineering College, Othakuthirai, K Mettupalayam Post, Gobichettipalayam, Erode District 638455 265
337 2683 Shreenivasa Engineering College, B Pallipatti, Bommidi, Pappireddipatti Taluk, Dharmapuri District 635301 228
338 3802 Shri Angalamman College of Engineering and Technology Siruganoor, Tiruchirappalli District 621105 309`,

  // Page 17
  `339 3760 Sir Issac Newton College of Engineering and Technology, Anthanapeetai Post, Papakoil, Nagappattinam District 611102 303
340 4938 Sivaji College of Engineering and Technology, Manivilla Palulai Panchayat, Vilavancode, Kanyakumari District 629170 377
341 3451 SMR East Coast College of Engineering & Technology, East Coast Road, Somanathapattinam, Thanjavur District 614612 291
342 5914 SOLAMALAI COLLEGE OF ENGINEERIG, Veerapanjan, Madurai District 625020 451
343 2618 Sona College of Technology (Autonomous), Suramangalam Post, Salem District 636005 187
344 1438 Sree Krishna College of Engineering, Anaicut Post, Unnai Village, Vellore District 632101 112
345 5502 Sree Raaja Raajan College of Engineering & Technology, Amaravathi Village, Amaravathi Pudur Post, Karaikudi, Sivagangai District 630301 430
346 2673 Sree Sakthi Engineering College, Bettathapuram, Bilichi Village, Karamadai, Coimbatore District 641104 226
347 1217 Sree Sastha Institute of Engineering and Technology, Chembarambakkam, Chennai 600103 46
348 4970 Sree Sowdambiga College of Engineering, Aruppukkottai Taluk, Virudhunagar District 626134 401
349 2767 SRG Engineering College, Aniyapuram Post, Namakkal District 637017 278
350 1513 Sri Balaji Chockalingam Engineering College, Arni, Thiruvannamalai District 632317 130
351 3852 Sri Bharathi Engineering College for Women, Kaikkuruchi Village, Alangudi Taluk, Pudukkottai District 622303 343
352 2739 Sri Eshwar College of Engineering (Autonomous), Kondampatti Post, Vadasithur (Via), Kinathukadavu, Coimbatore District 642102 259
353 1150 Sri Jayaram Institute of Engineering and Technology, 51 N, Elavur, 58N, Natham, Gummidipoondi Taluk, Thiruvallur District 601201 34
354 1526 Sri Krishna College of Engineering, Tiruttani High Road, Arakkonam, Ranipet District 631003 141
355 2718 Sri Krishna College of Enginering and Technology (Autonomous) , Kuniamuthur, Coimbatore District 641008 243
356 2722 Sri Krishna College of Technology (Autonomous) , Kovaipudur Post, Coimbatore District 641042 246
357 1427 Sri Krishna Engineering College, Panappakkam, Padappai, Chennai 601301 104
358 1335 Sri Krishna Institute of Technology, Panapakkam, Padappai, Chennai 601301 83
359 1218 Sri Muthukumaran Institute of Technology, Near Mangadu, Chennai 600069 47
360 1514 Sri Nandhanam College of Engineering and Technology, Thiruppathur Dt 635601 131`,

  // Page 18
  `361 1115 Sri Ram Engineering College, Perumalpattu, Veppampattu (R S), Thiruvallur District 602 024 17
362 3454 Sri Ramakrishna College of Engineering, Sri Saradha Nagar, NH-45, Perambalur District 621113 292
363 2719 Sri Ramakrishna Engineering College (Autonomous), Vattamalaipalayam, Coimbatore District 641022 244
364 2725 Sri Ramakrishna Institute of Technology (Autonomous), Pachapalayam, Coimbatore District 641010 248
365 1426 Sri Ramanujar Engineering College, Vandalur, Kolappakkam, Chennai 600048 103
366 2342 Sri Ranganathar Institute of Engineering and Technology, Thudialur-Kovilpalay Road, Coimbatore District 641110 156
367 1445 Sri Rangapoopathi College of Engineering, Alampoondi Village, Gingee, Villupuram District 604151 116
368 1324 Sri Sai Ram Institute of Technology (Autonomous), West Tambaram, Chennai 600044 80
369 2737 Sri Sai Ranganathan Engineering College, Zahirnaickenpalayam Village, Viraliyur Post, Thondamuthur Via, CoimbatoreDistrict 641109 258
370 1419 Sri Sairam Enginering College (Autonomous), West Tambaram, Chennai 600044 97
371 1521 Sri Sapthagiri Institute of Technology, Ocheri, Arakonam Taluk, Ranipet District 632531 137
372 2727 Sri Shakthi Institute of Engineering and Technology (Autonomous), L&T Bye-Pass, Venkitapuram Post, Comibatore District 641062 250
373 2302 Sri Shanmugha College of Engineering and Technology, Morur Bit II Village, Salem District 637302 148
374 1315 Sri Sivasubramaniya Nadar College of Engineering (Autonomous), Kalavakkam, Old Mahabalipuram Road (OMR), Chengalpattu District 603110 71
375 5720 Sri Subramanya College of Engineering and Technology, Sukkamanaickanpatti, Palani, Dindigul District 624615 437
376 1219 Sri Venkateswara College of Engineering (Autonomous), Post Bag No.1, Chennai-Bengaluru High Road, Pennalur, Irungattukottai S.O., Sriperumbudur Taluk, Kancheepuram District 602117 48
377 1116 Sri Venkateswara College of Engineering and Technology, Thirupachur, Thiruvallur District 631203 18
378 1121 Sri Venkateswara Institute of Science and Technology, Kozhundalur, Thiruvallur District 631203 21
379 1413 Sri Venkateswaraa College of Technology, Sirukulathur, Vadakkal Village, Pondur Post, Sriperumbudur Taluk, Kancheepuram District 602105 93
380 4996 Sri Vidhya College of Engineering and Technology, Sivakasi Main Road, P Kumaralinapuram, Virudhunagar District 626005 421
381 3795 SRM TRP Engineering College, Irungalur, Manachanallur Taluk, Tiruchirappalli District 621105 307`,

  // Page 19
  `382 1422 SRM Valliammai Engineering College (Autonomous), Kattankulathur, Chennai 603203 100
383 5530 SSM Institute of Engineering and Technology, Kuttathupatti Village, Sindalaigundu Post, Dindigul District 624002 431
384 3860 St. Annes College of Engineering and Technology, Anguchettypalayam, Siruvathur Post, Panruti, Cuddalore District 607110 348
385 1325 St. Joseph College of Engineering, Trinity Campus, Nemili, Sriperumpudur Taluk, Kancheepuram District 602105 81
386 1317 St. Joseph's College of Engineering, Old Mahabalipuram Road (OMR), Chennai 600 119 73
387 3825 St. Josephs College of Engineering and Technology, Elupatti Village, Rawaspatti Post, Thanjavur District 613403 328
388 1149 St. Joseph's Institute of Technology, Jeppiaar Nagar, Old Mahabalipuram Road (OMR), Chennai 600119 33
389 5919 St. Michael College of Engineering and Technology, Kalayarkoil, Sivagangai District 630551 453
390 4933 St. Mother Theresa Engineering College, Vagaikulam, Thoothukudi District 628102 374
391 1127 St. Peters College of Engineering and Technology, College Road, Avadi, Chennai 600 054 27
392 4971 St. Xavier Catholic College of Engineering, Chunkankadai, Nagercoil, Kanyakumari District 629807 402
393 3766 Star Lion College of Engineering & Technology, Manankorai Main Road, Manankorai Village, Thanjavur District 614206 304
394 4672 Stella Marys College of Engineering, Arunthengan Vilai, Azhikal Post, Kanyakumari District 629202 360
395 2770 Study World College of Engineering, Madukarai Post, Coimbatore - 641 105. 280
396 3920 Sudharsan Engineering College, Sathiyamangalam Post, Pudukkottai District 622501 352
397 2360 Suguna College of Engineering, Kalappatti Road, Civil Aerodrome Post, Coimbatore District 641014 167
398 3460 Surya College of Engineering, Konalai, Tiruchirappalli District 621132 296
399 2748 Surya Engineering College, Mettukadai, Kathirampatti Post, Erode District 638107 266
400 1434 Surya Group of Institutions, GST Road, Vikravandi Village, Villupuram District 605652 108
401 5921 Syed Ammal Engineering College, Achuthan Vayal Post, Ramanathapuram District 623502 454
402 1241 T J S Engineering College, Peruvoyal, Near Kavaraipettai, Gummidipoondi Taluk, Thiruvallur District 601206 60`,

  // Page 20
  `403 1415 T S M Jain College of Technology, Melur Village, Kallakurichi District 606201 95
404 1318 T.J INSTITUTE OF TECHNOLOGY, KARAPAKKAM CH-97 74
405 1420 Tagore Engineering College, Rathnamangalam, Vandalur Post, Chennai 600048 98
406 2646 Tagore Institute of Engineering and Technology, Deviyakurichi, Attur Taluk, Salem District 636112 210
407 2721 Tamilnadu College of Engineering, Karumathampatti Post, Coimbatore District 641659 245
408 4669 Thamirabharani Engineering College, Chathirampudukulam Village, Thatchanallur, Tirunelveli District 625358 358
409 1319 Thangavelu Engineering College, Karappakkam, Chennai 600097 75
410 1516 Thanthai Periyar Government Institute of Technology, Bagayam, Vellore District 632002 132
411 2666 The Kavery College of Engineering, M Kalipatti Post, Mecheri, Salem District 636453 225
412 2625 The Kavery Engineering College, M Kalipatti Post, Mecheri, Salem District 634456 193
413 5988 Theni Kammavar Sangam College of Technology, Theni Main Road, Koduvillarpatti Post, Theni District 625534 460
414 5008 Thiagarajar College of Engineering (Autonomous),Tirupparankundram, Madurai District 625015 424
415 1517 Thirumalai Engineering College, Kilambi, Kancheepuram District 631551 133
416 1518 Thiruvalluvar College of Engineering and Technology, Vandavasi, Thiruvannamalai District 604505 134
417 3820 Trichy Engineering College, Konalai, Tiruchirappalli District 621132 325
418 4978 Udaya School of Engineering, Ammandivilai Post, Kanyakumari District 629204 409
419 5942 Ultra College of Engineering and Technology, Kodikulam, 1 Bit Village, Madurai-Chennai Highway, Madurai District 625104 458
420 2761 United Institute of Technology, Gadalore Village, Perianaickenpalayam, Coimbatore District 641020 274
421 4675 Universal College of Engineering and Technology, Anbagam Campus, Radhapuram Road, Vallioor, Tirunelveli District 627117 361
422 3016 University College of Engineering, Ariyalur, Kathankudikadu Village, Thelur Post, Ariyalur District 621704 284
423 1015 University College of Engineering, Arni, Arni to Devikapuram Road, Thatchur, Arni, Thiruvannamalai District 632326 7
424 5022 University College of Engineering, Dindigul, Mangarai Pirivu, Reddiyarchathiram, Dindigul District 624622 429`,

  // Page 21
  `425 1026 University College of Engineering, Kancheepuram, Ponnerikarai Campus, NH4, Chennai-Bangalore Highway, Karaipettai Village & Post, Kancheepuram District 631552 8
426 4023 University College of Engineering, Nagercoil, Nagercoil Industrial Estate, Konam, Kanyakumari District 629004 356
427 3019 University College of Engineering, Panruti, Chennai-Kumbakonam Highway, Panikkankuppam, Panruti, Cuddalore District 607106 286
428 3021 University College of Engineering, Pattukkottai, ECR Road, Rajamadam, Pattukkottai Taluk, Thanjavur District 614701 287
429 5017 University College of Engineering, Ramanathapuram, Pullangudi, Ramanathapuram District 623513 428
430 3018 University College of Engineering, Thirukkuvalai, Nagappattinam District 610204 285
431 1014 University College of Engineering, Tindivanam, Melpakkam, Tindivanam, Villupuram District 604001 6
432 3011 University College of Engineering, Tiruchirappalli, (Bharathidasan Institute of Technology), Tiruchirappalli District 620024 283
433 1013 University College of Engineering, Villupuram, Kakuppam, Villupuram District 605103 5
434 0002 University Departments of Anna University, Chennai - ACT Campus, Sardar Patel Road, Guindy, Chennai 600 025 2
435 0001 University Departments of Anna University, Chennai - CEG Campus, Sardar Patel Road, Guindy, Chennai 600 025 1
436 0004 University Departments of Anna University, Chennai - MIT Campus, Chrompet, Tambaram Taluk, Chengalpattu District 600 044 3
437 4024 University V.O.C. College of Engineering, Thoothukudi, Near V.O.C. College, Millerpuram, Thoothukudi District 628008 357
438 4941 Unnamalai Institute of Technology, Ayyaneri, Kovilpatti, Thoothukudi District 628502 378
439 4979 V P Muthaiah Pillai Meenakshi Ammal Engineering College for Women, Srivilliputhur Taluk, Virudhunagar District 626190 410
440 1421 V R S College of Engineering and Technology, Arasur, Villupuram District 607107 99
441 2658 V S A Group of Institutions, NH-47, Uthamasola Puram Post, Salem District 636010 219
442 2357 V S B College of Engineering Technical Campus, Ealur Pirivu, Solavampalayam Post, Coimbatore District 642109 166
443 2622 V S B Engineering College, Kovai Road, Karur District 639111 190
444 4864 V V College of Engineering, Arasoor Village, Idaichivilai Post, Santhakulam Taluk, Thoothukudi District 628656 367
445 5532 Vaigai College of Engineering, Therkutheru, Melur Taluk, Madurai District 625122 432`,

  // Page 22
  `446 3848 Vandayar Engineering College, Pulavarnatham Post, Mariamman Koil (Via), Thanjavur District 613001 340
447 2641 Varuvan Vadivelan Institute of Technology, Nallanahalli, Dharmapuri District 636701 207
448 5851 Veerammal Engineering College, K Singarakottai, Dindigul District 624708 440
449 1122 Vel Tech High Tech Dr. Rangarajan Dr. Sakunthala Engineering College, Avadi-Alamathi Road, Chennai 600 062 22
450 1118 Vel Tech Multi Tech Dr. Rangarajan Dr. Sakunthala Engineering College (Autonomous), Avadi-Alamathi Road, Chennai 600 062 19
451 2723 Velalar College of Engineering and Technology (Autonomous), Thindal Post, Erode District 638009 247
452 5986 Velammal College of Engineering and Technology, Madurai District 625009 459
453 1120 Velammal Engineering College (Autonomous), Ambattur-Redhills Road, Chennai 600066 20
454 1237 Velammal Institute of Technology, Chennai-Kolkatta Highway, Panchetti Village, Ponneri Taluk, Thiruvallur District 601204 58
455 3850 Vetri Vinayaha College of Engineering and Technology, Namakkal-Trichy Main Road, Tholurpatti Village, Thottiam, Tiruchirappalli District 621215 342
456 1333 Vi Institute of Technology, Sirunkundram Village & Post, Chengalpattu District 603108 82
457 2633 Vidhya Vikkas College of Engineering and Technology, Varahoorampatti, Tiruchengode, Namakkal District 637 214 200
458 4982 Vins Christian College of Engineering, Chunkankadai Post, Nagercoil, Kanyakumari District 629807 413
459 4945 Vins Christian Womens College of Engineering, Chunkankadai Post, Nagercoil, Kanyakumari District 629807 381
460 2620 Vivekanandha College of Engineering for Women (Autonomous), Sathinaickenpalayam, Elayampalayam Village, Kumaramangalam, Namakkal District 637205 188
461 2661 Vivekanandha College of Technology for Women, Sathinaickenpalayam, Elayampalayam Village, Kumaramangalam, Namakkal District 637205 221`
];

const KNOWN_DISTRICTS = [
  "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri",
  "Dindigul", "Erode", "Kallakurichi", "Kancheepuram", "Kanyakumari", "Karur",
  "Krishnagiri", "Madurai", "Nagappattinam", "Namakkal", "Perambalur", "Pudukkottai",
  "Ramanathapuram", "Ranipet", "Salem", "Sivagangai", "Tenkasi", "Thanjavur",
  "The Nilgiris", "Theni", "Thiruvallur", "Thiruvarur", "Thiruvannamalai",
  "Thiruppathur", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupattur",
  "Tiruppur", "Vellore", "Villupuram", "Virudhunagar"
];

function extractDistrict(text) {
  for (const d of KNOWN_DISTRICTS) {
    const regex = new RegExp(`\\b${d}\\b`, 'i');
    if (regex.test(text)) return d;
  }
  // Check for common district spelling variations
  if (/Nilgiris/i.test(text)) return "The Nilgiris";
  if (/Tirupur/i.test(text)) return "Tiruppur";
  if (/Trichy/i.test(text)) return "Tiruchirappalli";
  if (/Kanchipuram/i.test(text)) return "Kancheepuram";
  if (/Tiruppathur/i.test(text) || /Tirupattur/i.test(text)) return "Tirupattur";
  if (/Kallakkurichi/i.test(text)) return "Kallakurichi";
  return "Tamil Nadu";
}

function extractPincode(text) {
  const match = text.match(/\b(6\d{2}\s?\d{3})\b/);
  return match ? match[1].replace(/\s+/g, '') : "";
}

function cleanCollegeName(fullName) {
  // e.g. "A C T College of Engineering and Technology, Nelvoy Village, Pukkathurai Post, Maduranthagam, Chengalpattu District 603107"
  // split at first comma
  const parts = fullName.split(',');
  let name = parts[0].trim();
  // If first part has something like "(Formerly Haji...", include it if it's part of the name
  if (parts.length > 1 && parts[1].includes("Formerly")) {
    name += `, ${parts[1].trim()}`;
  }
  return name;
}

function determineCollegeType(name, officialName) {
  const lower = (name + " " + officialName).toLowerCase();
  if (lower.includes("university department") || lower.includes("ceg campus") || lower.includes("act campus") || lower.includes("mit campus")) {
    return "University Department";
  }
  if (lower.includes("government college") || lower.includes("alagappa chettair government") || lower.includes("central institute") || lower.includes("central electrochemical") || lower.includes("thantai periyar government") || lower.includes("university college of engineering") || lower.includes("annamalai university faculty")) {
    return "Government";
  }
  if (lower.includes("psg college of technology") || lower.includes("coimbatore institute of technology") || lower.includes("thiagarajar college of engineering")) {
    return "Aided";
  }
  if (lower.includes("(autonomous)")) {
    return "Autonomous";
  }
  return "Self-Financing";
}

const parsedColleges = [];

rawPages.forEach((pageText, pIdx) => {
  const lines = pageText.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    // Regex: S.No (1-3 digits), Code (4 digits or 000X), Full details..., Page No at end
    const match = line.match(/^(\d+)\s+([0-9]{4})\s+(.+?)\s+(\d+)$/);
    if (!match) {
      console.warn(`Line failed to parse: "${line}"`);
      continue;
    }
    const [_, sNoStr, code, details, pageNoStr] = match;
    const sNo = parseInt(sNoStr, 10);
    const pageNo = parseInt(pageNoStr, 10);
    const collegeName = cleanCollegeName(details);
    const district = extractDistrict(details);
    const pincode = extractPincode(details);
    const isAutonomous = details.toLowerCase().includes("(autonomous)");
    const collegeType = determineCollegeType(collegeName, details);

    // Extract town or city
    let city = district;
    const parts = details.split(',').map(s => s.trim());
    if (parts.length >= 2) {
      // Pick a candidate city before district/pincode
      const cand = parts[parts.length - 2];
      if (cand && !cand.toLowerCase().includes("district") && !cand.match(/\d/)) {
        city = cand;
      }
    }

    parsedColleges.push({
      sNo,
      code,
      name: collegeName,
      official_name: details,
      district,
      city,
      pincode,
      autonomous_status: isAutonomous ? "Autonomous" : "Non-Autonomous",
      college_type: collegeType,
      pageNo
    });
  }
});

console.log(`Total parsed colleges: ${parsedColleges.length}`);
if (parsedColleges.length > 0) {
  console.log('Sample parsed:', JSON.stringify(parsedColleges[0], null, 2));
  console.log('Sample last:', JSON.stringify(parsedColleges[parsedColleges.length - 1], null, 2));
}

// Find missing S.Nos if any
const sNos = new Set(parsedColleges.map(c => c.sNo));
const missing = [];
for (let i = 1; i <= 461; i++) {
  if (!sNos.has(i)) missing.push(i);
}
console.log(`Missing S.Nos (out of 461):`, missing);

fs.writeFileSync(path.join(process.cwd(), 'scripts', 'parsed_colleges.json'), JSON.stringify(parsedColleges, null, 2));
