--
-- PostgreSQL database dump
--

\restrict jaJkfKk23AyC84dM8RSjhKnwphZjLl3HS5YrQOwyoWJHAf00TjVvckhAHuOqmlt

-- Dumped from database version 17.7 (Debian 17.7-3.pgdg13+1)
-- Dumped by pg_dump version 17.7 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: academy_wishlist_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.academy_wishlist_entries (
    id integer NOT NULL,
    email text NOT NULL,
    phone_number text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.academy_wishlist_entries OWNER TO postgres;

--
-- Name: academy_wishlist_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.academy_wishlist_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.academy_wishlist_entries_id_seq OWNER TO postgres;

--
-- Name: academy_wishlist_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.academy_wishlist_entries_id_seq OWNED BY public.academy_wishlist_entries.id;


--
-- Name: academy_wishlist_entries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academy_wishlist_entries ALTER COLUMN id SET DEFAULT nextval('public.academy_wishlist_entries_id_seq'::regclass);


--
-- Data for Name: academy_wishlist_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.academy_wishlist_entries (id, email, phone_number, created_at) FROM stdin;
3	gyul1226@gmail.com	0886750852	2026-02-10 19:02:25.970212
4	gabrielatonceva13@gmail.com	0895040898	2026-02-10 20:15:08.958849
6	karinadraeva1@gmail.com	0889136008	2026-02-11 12:45:17.972289
7	eleonoradimitrova43@gmail.com	+359884843864	2026-02-12 16:27:00.137595
8	mariagrahovska11@gmail.com	0888962623	2026-02-12 18:08:06.796907
9	hypex01@abv.bg	0899062725	2026-02-12 20:19:50.787201
10	raya04ivn@hmail.com	0877448487	2026-02-13 06:33:07.881455
11	oiyiweror@yahoo.com	0887791951	2026-02-13 09:12:27.037056
12	monika2009p@abv.bg	0876778578	2026-02-13 13:15:40.572921
13	kevinkolev0@gmail.com	0877850090	2026-02-13 14:21:29.598893
14	kristiantodorov612@gmail.com	0887556953	2026-02-13 20:53:55.16734
15	rayadoneva@gmail.com	0877244321	2026-02-13 22:55:19.620478
16	siliaflo99@gmail.com	0877431427	2026-02-14 23:19:43.570794
17	gochevakarina@gmail.com	0882950554	2026-02-15 11:30:12.404538
18	ivonmanova02@gmail.com	0884043704	2026-02-15 16:22:04.125815
19	dani.katrev@gmail.com	+359896868845	2026-02-15 19:37:37.379338
20	marina.kabaivanova@gmail.com	895109076	2026-02-15 21:51:31.833753
21	kircheva.aleksandra@gmail.com	0896648512	2026-02-15 23:28:21.514876
22	nandia.erke@yahoo.com	+359899917474	2026-02-16 05:27:19.466993
23	denismolla19@gmail.com	+359894918530	2026-02-16 08:15:21.533828
24	dimovaiva10@gmail.com	+359882315635	2026-02-16 09:28:30.204177
25	viktoriaradkova9@gmail.com	0876669518	2026-02-16 10:15:25.684924
26	nikisachkova@gmail.com	0877959696	2026-02-16 12:37:46.790885
27	dimitrov.martin1103@gmail.com	0889935746	2026-02-16 15:23:42.511469
28	fereshtasaid905@gmail.com	0899111592	2026-02-16 15:26:54.750426
29	veronikadincheva089@gmail.com	0877543711	2026-02-16 17:41:21.622057
30	nikolnikolova1000@gmail.com	0882515931	2026-02-17 08:25:31.858618
31	rashkabogoeva691@gmail.com	0887704147	2026-02-17 09:33:27.916501
32	l.djelepova4@gmail.com	0887171022	2026-02-17 17:12:36.289041
33	raiabiserova@gmail.com	+359988709099	2026-02-18 12:43:10.740478
34	pepita74@avb.bg	896752900	2026-02-18 13:46:25.419018
\.


--
-- Name: academy_wishlist_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.academy_wishlist_entries_id_seq', 34, true);


--
-- Name: academy_wishlist_entries academy_wishlist_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academy_wishlist_entries
    ADD CONSTRAINT academy_wishlist_entries_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

\unrestrict jaJkfKk23AyC84dM8RSjhKnwphZjLl3HS5YrQOwyoWJHAf00TjVvckhAHuOqmlt

