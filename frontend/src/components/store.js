import { writable } from "svelte/store"

let now = new Date();

export const year = writable(now.getFullYear())
export const month = writable(now.getMonth())
export const day = writable(now.getDate())