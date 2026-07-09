import React from 'react';
import { View, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Sheet, Button, Badge, Surface, Text, useToast } from './ui';

export default function LevelUpModal({ visible, stats, onClose }) {
    const { colors, space, radius } = useTheme();
    const toast = useToast();

    const handleShare = async () => {
        try {
            await Share.share({
                message: `I just leveled up to Level ${stats?.level} on Weapon Fitness! My fitness journey is getting stronger every day. #WeaponFitness #FitnessLevelUp`,
            });
        } catch (error) {
            toast.show("Couldn't open the share sheet.", { kind: 'error' });
        }
    };

    return (
        <Sheet
            visible={visible}
            onClose={onClose}
            footer={
                <>
                    <Button title="Return to Battle" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
                    <Button title="Share Your Victory" icon="share-social" onPress={handleShare} style={{ flex: 2 }} />
                </>
            }
        >
            <View style={{ alignItems: 'center' }}>
                {/* Medal medallion */}
                <View
                    style={{
                        width: 100,
                        height: 100,
                        borderRadius: radius.full,
                        backgroundColor: colors.warningSoft,
                        borderWidth: 1,
                        borderColor: colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: space[5],
                    }}
                >
                    <Ionicons name="medal" size={56} color={colors.warning} />
                </View>

                <Text variant="display" align="center">LEVEL UP!</Text>
                <Text variant="label" color="accentBright" align="center" style={{ marginTop: space[1] }}>
                    Warrior Tier Increased
                </Text>

                <View style={{ marginVertical: space[5] }}>
                    <Badge tone="accent" icon="trophy">{`Tier ${stats?.level ?? ''}`}</Badge>
                </View>

                <Text variant="body" color="textMuted" align="center" style={{ marginBottom: space[6], maxWidth: 320 }}>
                    Your strength and discipline have earned you a new rank. The gym honors your dedication!
                </Text>
            </View>

            <Surface style={{ padding: space[4] }}>
                <Text variant="labelSm" color="accentBright" align="center" style={{ marginBottom: space[4] }}>
                    Unlocked Rewards
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], marginBottom: space[3] }}>
                    <View
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: radius.full,
                            backgroundColor: colors.accentSoft,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="flash" size={16} color={colors.accentBright} />
                    </View>
                    <Text variant="body">New Exercise Patterns</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
                    <View
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: radius.full,
                            backgroundColor: colors.accentSoft,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="shield" size={16} color={colors.accentBright} />
                    </View>
                    <Text variant="body">Elite Profile Border</Text>
                </View>
            </Surface>
        </Sheet>
    );
}
