import { useCallback, useEffect, useRef, useState } from "react";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { ChatMessage } from "@/lib/types";

type ChatStatus = UseChatHelpers<ChatMessage>["status"] | "streaming";

interface UseChatScrollOptions {
  status: ChatStatus;
  messages: ChatMessage[];
  inputHeight: number;
}

export function useInputHeight() {
  const [inputHeight, setInputHeight] = useState(0);
  const observerRef = useRef<ResizeObserver | null>(null);
  const elRef = useRef<HTMLDivElement | null>(null);

  const inputRef = useCallback((el: HTMLDivElement | null) => {

    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    elRef.current = el;
    if (!el) return;

    const measure = () => {
      const h = el.getBoundingClientRect().height;
      setInputHeight((prev) => (prev !== h ? h : prev));
    };

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    observerRef.current = observer;

    measure();
    requestAnimationFrame(measure);
  }, []);

  return { inputRef, inputHeight };
}

export function useChatScroll({ status }: UseChatScrollOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevStatusRef = useRef<ChatStatus>(status);

  const isStickingRef = useRef(true);
  const userScrolledRef = useRef(false);
  const [showButton, setShowButton] = useState(false);

  const checkIsAtBottom = useCallback(() => {
    const c = containerRef.current;
    if (!c) return true;
    return c.scrollHeight - c.scrollTop - c.clientHeight < 50;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const c = containerRef.current;
    if (!c) return;
    c.scrollTo({ top: c.scrollHeight, behavior });
    isStickingRef.current = true;
    setShowButton(false);
  }, []);

  const reset = useCallback(() => {
    isStickingRef.current = true;
    userScrolledRef.current = false;
    setShowButton(false);
    prevStatusRef.current = "ready";
  }, []);

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;

    let scrollTimeout: ReturnType<typeof setTimeout>;

    const handleScroll = () => {
      const atBottom = checkIsAtBottom();
      setShowButton(!atBottom);

      if (userScrolledRef.current) {
        if (!atBottom) {
          isStickingRef.current = false;
        } else {
          isStickingRef.current = true;
        }
      }
      userScrolledRef.current = true;
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        userScrolledRef.current = false;
      }, 100);
    };

    c.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      c.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [checkIsAtBottom]);

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;

    let prevScrollTop = c.scrollTop;
    let prevScrollHeight = c.scrollHeight;

    const trackScroll = () => {
      prevScrollTop = c.scrollTop;
      prevScrollHeight = c.scrollHeight;
    };
    c.addEventListener("scroll", trackScroll, { passive: true });

    const observer = new ResizeObserver(() => {
      if (isStickingRef.current) {

        c.scrollTop = c.scrollHeight;
      } else {

        const delta = c.scrollHeight - prevScrollHeight;
        c.scrollTop = prevScrollTop + delta;
      }
      prevScrollTop = c.scrollTop;
      prevScrollHeight = c.scrollHeight;
    });

    observer.observe(c);
    return () => {
      observer.disconnect();
      c.removeEventListener("scroll", trackScroll);
    };
  }, []);

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    if (status === "submitted" && prev !== "submitted") {
      requestAnimationFrame(() => {
        scrollToBottom("smooth");
      });
    }
  }, [status, scrollToBottom]);

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    if (status !== "streaming") return;

    const observer = new MutationObserver(() => {
      if (isStickingRef.current) {
        c.scrollTo({ top: c.scrollHeight, behavior: "instant" });
      }
    });

    observer.observe(c, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [status]);

  return {
    containerRef,
    showButton,
    scrollToBottom,
    reset,
  };
}
