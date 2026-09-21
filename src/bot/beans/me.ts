import { Bean } from "@/core/bean";

export const meBean: Bean<string> = {
  name: 'me',
  value: process.env.ME,
};
