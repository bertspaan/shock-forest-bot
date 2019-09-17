CREATE TABLE public.messages (
	id int NOT NULL,
  chat_id bigint NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  edited BOOLEAN DEFAULT FALSE,
  reply_to int,
  user_id int NOT NULL,
  text text,
  data jsonb,
  PRIMARY KEY (id, chat_id, timestamp)
);

-- TODO: create indexes!!!!
--   - id
--   - timestamp
--   - reply_to

CREATE TABLE public.hashtags (
  hashtag text,
  message_id int NOT NULL,
  chat_id bigint NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (hashtag, chat_id, message_id),
  FOREIGN KEY (message_id, chat_id, timestamp) references public.messages(id, chat_id, timestamp) ON DELETE CASCADE
);

-- TODO: create indexes!!!!

CREATE TABLE public.files (
  id text NOT NULL,
  message_id int NOT NULL,
  chat_id bigint NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  file_name text,
  file_size int,
  mime_type text,
  path text,
  PRIMARY KEY (id),
  FOREIGN KEY (message_id, chat_id, timestamp) references public.messages(id, chat_id, timestamp) ON DELETE CASCADE
);

-- TODO: create indexes!!!!