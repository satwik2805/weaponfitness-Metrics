import React, { useState } from "react";
import { View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { Sheet, Input, Button, Text, Chip, useToast } from "./ui";

export default function BroadcastEmailModal({ visible, onClose, onSend }) {
  const { space } = useTheme();
  const toast = useToast();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sendToTrainees, setSendToTrainees] = useState(true);
  const [sendToTrainers, setSendToTrainers] = useState(false);

  const handleSend = () => {
    if (!subject.trim() || !message.trim()) {
      toast.show("Please fill in both the subject and the message.", { kind: "error" });
      return;
    }

    if (!sendToTrainees && !sendToTrainers) {
      toast.show("Please select at least one recipient type.", { kind: "error" });
      return;
    }

    onSend({
      subject,
      message,
      sendToTrainees,
      sendToTrainers,
    });

    // Clear
    setSubject("");
    setMessage("");
    setSendToTrainees(true);
    setSendToTrainers(false);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Send Email Broadcast"
      footer={
        <>
          <Button title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
          <Button title="Send" icon="send" onPress={handleSend} style={{ flex: 2 }} />
        </>
      }
    >
      <View style={{ gap: space[4] }}>
        <Input
          label="Subject"
          placeholder="Enter subject"
          value={subject}
          onChangeText={setSubject}
        />

        <Input
          label="Message"
          placeholder="Enter your message"
          value={message}
          onChangeText={setMessage}
          multiline
          inputStyle={{ height: 120 }}
        />

        <View>
          <Text variant="label" color="textMuted" style={{ marginBottom: space[2] }}>
            Send To
          </Text>
          <View style={{ flexDirection: "row", gap: space[2] }}>
            <Chip
              label="Trainees"
              selected={sendToTrainees}
              onPress={() => setSendToTrainees(!sendToTrainees)}
            />
            <Chip
              label="Trainers"
              selected={sendToTrainers}
              onPress={() => setSendToTrainers(!sendToTrainers)}
            />
          </View>
        </View>
      </View>
    </Sheet>
  );
}
