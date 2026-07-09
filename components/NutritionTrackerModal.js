import React, { useState, useEffect } from "react";
import { View, Image, Pressable } from "react-native";
import { useTheme } from "../context/ThemeContext";

const FOOD_IMAGES = {
    // Local generated food photography (100% relevant)
    "boiled chicken & broccoli": require("../assets/photos/boiled_chicken_desi.png"),
    "grilled paneer tikka": require("../assets/photos/paneer_tikka_skimmed.png"),
    "sprouts & moong dal salad": require("../assets/photos/sprouts_salad.png"),
    
    // Indian
    "egg white scramble": require("../assets/photos/egg_white_scramble.png"),
    "roasted chana": require("../assets/photos/roasted_chana.png"),
    "masala soya bhurji": require("../assets/photos/masala_soya_bhurji.png"),
    "sattu protein shake": require("../assets/photos/sattu_protein_shake.png"),
    "moong dal chilla": require("../assets/photos/moong_dal_chilla.png"),
    "curd & oats mash": require("../assets/photos/curd_oats_mash.png"),
    "boiled kala chana": require("../assets/photos/boiled_kala_chana.png"),
    
    // Italian
    "whole wheat chicken pasta": require("../assets/photos/whole_wheat_chicken_pasta.png"),
    "baked chicken parmesan": require("../assets/photos/baked_chicken_parmesan.png"),
    "turkey meatballs in marinara": require("../assets/photos/turkey_meatballs_in_marinara.png"),
    "tuna spinach cannelloni": require("../assets/photos/tuna_spinach_cannelloni.png"),
    
    // American / Western
    "grilled chicken and sweet potato": require("../assets/photos/grilled_chicken_sweet_potato.png"),
    "beef sirloin steak": require("../assets/photos/beef_sirloin_steak.png"),
    "oatmeal protein porridge": require("../assets/photos/oatmeal_protein_porridge.png"),
    "egg white omelette": require("../assets/photos/egg_white_omelette.png"),
    "grilled turkey breast": require("../assets/photos/grilled_turkey_breast.png"),
    
    // Asian
    "steamed tofu with jasmine rice": require("../assets/photos/steamed_tofu_jasmine_rice.png"),
    "garlic ginger shrimp stir fry": require("../assets/photos/garlic_ginger_shrimp_stir_fry.png"),
    "teriyaki chicken breast bowl": require("../assets/photos/teriyaki_chicken_breast_bowl.png"),
    "steamed edamame": require("../assets/photos/steamed_edamame.png"),
    
    // Mediterranean
    "grilled salmon with quinoa": require("../assets/photos/grilled_salmon_quinoa.png"),
    "mediterranean tuna salad": require("../assets/photos/mediterranean_tuna_salad.png"),
    "greek yogurt bowl with berries": require("../assets/photos/greek_yogurt_bowl_berries.png"),
    "grilled chicken souvlaki": require("../assets/photos/grilled_chicken_souvlaki.png"),
};
import { nutritionService } from "../services/nutritionService";
import FoodCameraScanner from "./FoodCameraScanner";
import {
    Sheet,
    Input,
    Button,
    IconButton,
    Text,
    Chip,
    SegmentedControl,
    ProgressBar,
    EmptyState,
    ErrorState,
    Surface,
    useToast,
} from "./ui";

const MEALS = ["Breakfast", "Lunch", "Dinner", "Snack"];

export default function NutritionTrackerModal({ visible, onClose, traineeId }) {
    const { colors, space } = useTheme();
    const toast = useToast();

    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState(null);

    // AI Smart Search
    const [showSmartSearch, setShowSmartSearch] = useState(false);
    const [foodLibrary, setFoodLibrary] = useState(null);
    const [selectedCuisine, setSelectedCuisine] = useState(null);
    const [smartSearchText, setSmartSearchText] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [parsedItems, setParsedItems] = useState([]);

    // Form for custom entry
    const [newItem, setNewItem] = useState({
        item_name: "",
        meal_name: "Lunch",
        calories: "",
        protein: "",
        carbs: "",
        fats: "",
        quantity: "",
    });

    useEffect(() => {
        if (visible && traineeId) {
            fetchData();
        }
    }, [visible, traineeId]);



    // Day Selection
    // For now defaults to today, but architecture supports others
    const now = new Date();
    const selectedDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    // Reflection State
    const [rating, setRating] = useState(null);
    const [notes, setNotes] = useState("");
    const [dailyLogId, setDailyLogId] = useState(null);
    const [savingReflection, setSavingReflection] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await nutritionService.getDailySummary(traineeId);
            setSummary(data);

            // Populate reflection if exists
            if (data.daily_log) {
                setRating(data.daily_log.quality_rating);
                setNotes(data.daily_log.notes || "");
                setDailyLogId(data.daily_log.id);
            } else {
                setRating(null);
                setNotes("");
                setDailyLogId(null);
            }

            // Fetch food library
            try {
                const lib = await nutritionService.getFoodLibrary();
                setFoodLibrary(lib);
                if (lib && Object.keys(lib).length > 0) {
                    setSelectedCuisine(Object.keys(lib)[0]);
                }
            } catch (libErr) {
                console.error("Error loading food library:", libErr);
            }
        } catch (err) {
            console.error("Error fetching nutrition data:", err);
            setError("Failed to load nutrition data");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveReflection = async () => {
        if (!rating && !notes) return;
        setSavingReflection(true);
        try {
            await nutritionService.saveDailyLog({
                trainee_id: traineeId,
                date: selectedDate,
                quality_rating: rating,
                notes: notes
            });
            toast.show("Daily reflection saved", { kind: "success" });
        } catch (e) {
            toast.show("Couldn't save your reflection. Please try again.", { kind: "error" });
        } finally {
            setSavingReflection(false);
        }
    };

    const handleLogItem = async () => {
        if (!newItem.calories) {
            toast.show("Enter at least the calories to log this meal.", { kind: "error" });
            return;
        }

        const finalName = newItem.item_name.trim() || "Quick Log";

        try {
            const logData = {
                trainee_id: traineeId,
                item_name: finalName,
                meal_name: newItem.meal_name,
                calories: parseFloat(newItem.calories) || 0,
                protein: parseFloat(newItem.protein) || 0,
                carbs: parseFloat(newItem.carbs) || 0,
                fats: parseFloat(newItem.fats) || 0,
                quantity: newItem.quantity,
            };

            await nutritionService.logNutrition(logData);
            setNewItem({
                item_name: "",
                meal_name: "Lunch",
                calories: "",
                protein: "",
                carbs: "",
                fats: "",
                quantity: "",
            });
            fetchData(); // Refresh
        } catch (err) {
            toast.show("Couldn't save this entry. Please try again.", { kind: "error" });
        }
    };

    const handleSmartSearch = async () => {
        if (!smartSearchText.trim()) return;
        setIsAnalyzing(true);
        try {
            const result = await nutritionService.parseNutrition(smartSearchText);
            setParsedItems(result.items || []);
        } catch (err) {
            toast.show("Couldn't analyze that description. Please try again.", { kind: "error" });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleAddParsedItem = async (item) => {
        try {
            await nutritionService.logNutrition({
                trainee_id: traineeId,
                meal_name: "Snack", // Default group
                ...item
            });
            setParsedItems(prev => prev.filter(i => i.item_name !== item.item_name));
            if (parsedItems.length <= 1) {
                setShowSmartSearch(false);
                setSmartSearchText("");
            }
            fetchData();
        } catch (e) {
            toast.show("Couldn't log that item. Please try again.", { kind: "error" });
        }
    };

    const handleAddAllParsed = async () => {
        try {
            for (const item of parsedItems) {
                await nutritionService.logNutrition({
                    trainee_id: traineeId,
                    meal_name: "Snack",
                    ...item
                });
            }
            setParsedItems([]);
            setShowSmartSearch(false);
            setSmartSearchText("");
            fetchData();
            toast.show("All items logged", { kind: "success" });
        } catch (e) {
            toast.show("Some items couldn't be logged. Check today's log and retry the rest.", { kind: "error" });
        }
    };

    const renderProgressBar = (label, current, goal, color) => {
        const ratio = goal > 0 ? Math.min(current / goal, 1) : 0;
        return (
            <View style={{ marginBottom: space[4] }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: space[2] }}>
                    <Text variant="bodySm" color="textMuted">{label}</Text>
                    <Text variant="statSm">{Math.round(current)} / {Math.round(goal)}</Text>
                </View>
                <ProgressBar progress={ratio} color={color} height={8} />
            </View>
        );
    };

    return (
        <Sheet
            visible={visible}
            onClose={onClose}
            title="Nutrition Tracker"
            subtitle="Log meals, track macros, reflect on the day."
        >
            {loading && !summary ? (
                <View style={{ paddingVertical: space[8], alignItems: "center" }}>
                    <Text variant="body" color="textMuted">Loading your day...</Text>
                </View>
            ) : error ? (
                <ErrorState title="Couldn't load nutrition" detail={error} onRetry={fetchData} />
            ) : (
                <>
                    {showSmartSearch && (
                        <View style={{ marginBottom: space[5] }}>
                            <FoodCameraScanner
                                onResult={(items) => {
                                    setParsedItems(items);
                                    setIsAnalyzing(false);
                                }}
                                onClose={() => setShowSmartSearch(false)}
                                colors={colors}
                            />

                            {/* TEXT FALLBACK BELOW CAMERA */}
                            <Surface style={{ padding: space[4], marginTop: space[3] }}>
                                <Text variant="label" color="accentBright" style={{ marginBottom: space[3] }}>
                                    Or Type Description
                                </Text>

                                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: space[2] }}>
                                    <Input
                                        placeholder="e.g. 2 eggs and toast"
                                        value={smartSearchText}
                                        onChangeText={setSmartSearchText}
                                        onSubmitEditing={handleSmartSearch}
                                        style={{ flex: 1 }}
                                    />
                                    <IconButton
                                        icon="search"
                                        variant="primary"
                                        onPress={handleSmartSearch}
                                        disabled={isAnalyzing}
                                        accessibilityLabel="Analyze description"
                                    />
                                </View>

                                {/* PARSED ITEMS RESULT LIST */}
                                {parsedItems.length > 0 && (
                                    <View style={{ marginTop: space[4] }}>
                                        <Text variant="label" style={{ marginBottom: space[3] }}>
                                            Analysis Result:
                                        </Text>
                                        {parsedItems.map((item, idx) => (
                                            <View
                                                key={idx}
                                                style={{
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    gap: space[2],
                                                    paddingVertical: space[2],
                                                    borderBottomWidth: 1,
                                                    borderBottomColor: colors.border,
                                                }}
                                            >
                                                <View style={{ flex: 1 }}>
                                                    <Text variant="h4">{item.item_name}</Text>
                                                    <Text variant="bodySm" color="textMuted" style={{ marginTop: 2 }}>
                                                        {Math.round(item.calories)} cal • P:{Math.round(item.protein)}g C:{Math.round(item.carbs)}g F:{Math.round(item.fats)}g
                                                    </Text>
                                                </View>
                                                <IconButton
                                                    icon="trash-outline"
                                                    variant="ghost"
                                                    color="danger"
                                                    iconSize={18}
                                                    onPress={() => setParsedItems(prev => prev.filter((_, i) => i !== idx))}
                                                    accessibilityLabel={`Remove ${item.item_name}`}
                                                />
                                                <IconButton
                                                    icon="add"
                                                    variant="soft"
                                                    iconSize={18}
                                                    onPress={() => handleAddParsedItem(item)}
                                                    accessibilityLabel={`Log ${item.item_name}`}
                                                />
                                            </View>
                                        ))}
                                        <Button
                                            title="Log All Items"
                                            onPress={handleAddAllParsed}
                                            fullWidth
                                            style={{ marginTop: space[3] }}
                                        />
                                    </View>
                                )}
                            </Surface>
                        </View>
                    )}

                    {!showSmartSearch && (
                        <Button
                            title="Scan Food with AI Camera"
                            icon="scan-outline"
                            variant="secondary"
                            onPress={() => setShowSmartSearch(true)}
                            fullWidth
                            style={{ marginBottom: space[5] }}
                        />
                    )}

                    {/* CUISINE QUICK ADD */}
                    {foodLibrary && Object.keys(foodLibrary).length > 0 && (
                        <Surface style={{ padding: space[4], marginBottom: space[5] }}>
                            <Text variant="label" color="accentBright" style={{ marginBottom: space[3] }}>
                                Cuisine Quick-Add
                            </Text>
                            <Text variant="bodySm" color="textMuted" style={{ marginBottom: space[4] }}>
                                Tap a preset gym food below to fill your entry form instantly.
                            </Text>

                            {/* Cuisine Tabs */}
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space[2], marginBottom: space[4] }}>
                                {Object.keys(foodLibrary).map((cuisine) => (
                                    <Chip
                                        key={cuisine}
                                        label={cuisine}
                                        selected={selectedCuisine === cuisine}
                                        onPress={() => setSelectedCuisine(cuisine)}
                                    />
                                ))}
                            </View>

                            {/* Preset Cards for Selected Cuisine */}
                            {selectedCuisine && foodLibrary[selectedCuisine] && (
                                <View style={{ gap: space[3] }}>
                                    {Object.entries(foodLibrary[selectedCuisine]).map(([foodName, macros]) => {
                                        const isSelected = newItem.item_name.toLowerCase() === foodName.toLowerCase();
                                        const imgSource = FOOD_IMAGES[foodName.toLowerCase()];
                                        
                                        return (
                                            <Pressable
                                                key={foodName}
                                                onPress={() => {
                                                    setNewItem({
                                                        ...newItem,
                                                        item_name: foodName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                                                        calories: String(macros.cal),
                                                        protein: String(macros.pro),
                                                        carbs: String(macros.carb),
                                                        fats: String(macros.fat),
                                                        quantity: "100g",
                                                    });
                                                    toast.show(`Filled details for ${foodName}`, { kind: "success" });
                                                }}
                                                style={{
                                                    flexDirection: "row",
                                                    backgroundColor: isSelected ? colors.accentSoft : colors.bgCard,
                                                    borderRadius: 12,
                                                    padding: space[3],
                                                    borderWidth: 1.5,
                                                    borderColor: isSelected ? colors.accentBright : "transparent",
                                                    alignItems: "center",
                                                    gap: space[3]
                                                }}
                                            >
                                                {imgSource ? (
                                                    <Image
                                                        source={imgSource}
                                                        style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: colors.bgApp }}
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <View
                                                        style={{
                                                            width: 64,
                                                            height: 64,
                                                            borderRadius: 8,
                                                            backgroundColor: colors.accentSoft,
                                                            alignItems: "center",
                                                            justifyContent: "center"
                                                        }}
                                                    >
                                                        <Text variant="h3" color="accentBright">
                                                            {foodName.charAt(0).toUpperCase()}
                                                        </Text>
                                                    </View>
                                                )}
                                                
                                                <View style={{ flex: 1 }}>
                                                    <Text variant="body" color="text" style={{ fontWeight: "600" }}>
                                                        {foodName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                                    </Text>
                                                    <Text variant="bodySm" color="textMuted" style={{ marginTop: 2 }}>
                                                        {macros.cal} kcal | P: {macros.pro}g | C: {macros.carb}g | F: {macros.fat}g
                                                    </Text>
                                                </View>
                                            </Pressable>
                                        );
                                    })}
                                    
                                    {/* Other / Custom Food Button */}
                                    <Pressable
                                        onPress={() => {
                                            setNewItem({
                                                item_name: "",
                                                meal_name: newItem.meal_name,
                                                calories: "",
                                                protein: "",
                                                carbs: "",
                                                fats: "",
                                                quantity: "",
                                            });
                                            toast.show("Cleared form for custom entry", { kind: "neutral" });
                                        }}
                                        style={{
                                            flexDirection: "row",
                                            backgroundColor: newItem.item_name === "" ? colors.accentSoft : colors.bgCard,
                                            borderRadius: 12,
                                            padding: space[3],
                                            borderWidth: 1.5,
                                            borderColor: newItem.item_name === "" ? colors.accentBright : "transparent",
                                            alignItems: "center",
                                            gap: space[3],
                                            borderStyle: "dashed"
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: 64,
                                                height: 64,
                                                borderRadius: 8,
                                                backgroundColor: colors.bgApp,
                                                alignItems: "center",
                                                justifyContent: "center",
                                                borderWidth: 1,
                                                borderColor: colors.textFaint,
                                                borderStyle: "dashed"
                                            }}
                                        >
                                            <Text variant="h3" color="textMuted">+</Text>
                                        </View>
                                        
                                        <View style={{ flex: 1 }}>
                                            <Text variant="body" color="text" style={{ fontWeight: "600" }}>
                                                Other / Custom Food
                                            </Text>
                                            <Text variant="bodySm" color="textMuted" style={{ marginTop: 2 }}>
                                                Type any missing or new food name & macros manually.
                                            </Text>
                                        </View>
                                    </Pressable>
                                </View>
                            )}
                        </Surface>
                    )}

                    <Surface style={{ padding: space[4], marginBottom: space[5] }}>
                        <Text variant="label" color="accentBright" style={{ marginBottom: space[4] }}>
                            New Food Entry (Macros)
                        </Text>

                        <SegmentedControl
                            segments={MEALS}
                            selectedIndex={Math.max(0, MEALS.indexOf(newItem.meal_name))}
                            onChange={(i) => setNewItem({ ...newItem, meal_name: MEALS[i] })}
                            style={{ marginBottom: space[4] }}
                        />

                        <Input
                            placeholder="Food Name (e.g. Chicken Breast)"
                            value={newItem.item_name}
                            onChangeText={(t) => setNewItem({ ...newItem, item_name: t })}
                            style={{ marginBottom: space[3] }}
                        />

                        <View style={{ flexDirection: "row", gap: space[3], marginBottom: space[3] }}>
                            <Input
                                label="Weight / Quantity"
                                placeholder="e.g. 150g"
                                value={newItem.quantity}
                                onChangeText={(t) => setNewItem({ ...newItem, quantity: t })}
                                style={{ flex: 1 }}
                            />
                            <Input
                                label="Calories (kcal)"
                                placeholder="0"
                                keyboardType="numeric"
                                value={newItem.calories}
                                onChangeText={(t) => setNewItem({ ...newItem, calories: t })}
                                style={{ flex: 1 }}
                            />
                        </View>

                        <View style={{ flexDirection: "row", gap: space[3], marginBottom: space[4] }}>
                            <Input
                                label="Protein (g)"
                                placeholder="0"
                                keyboardType="numeric"
                                value={newItem.protein}
                                onChangeText={(t) => setNewItem({ ...newItem, protein: t })}
                                style={{ flex: 1 }}
                            />
                            <Input
                                label="Carbs (g)"
                                placeholder="0"
                                keyboardType="numeric"
                                value={newItem.carbs}
                                onChangeText={(t) => setNewItem({ ...newItem, carbs: t })}
                                style={{ flex: 1 }}
                            />
                            <Input
                                label="Fats (g)"
                                placeholder="0"
                                keyboardType="numeric"
                                value={newItem.fats}
                                onChangeText={(t) => setNewItem({ ...newItem, fats: t })}
                                style={{ flex: 1 }}
                            />
                        </View>

                        <Button
                            title="Add Meal to Log"
                            icon="checkmark"
                            onPress={handleLogItem}
                            fullWidth
                        />
                    </Surface>

                    {/* DAILY PROGRESS CARD */}
                    <Surface style={{ padding: space[4], marginBottom: space[5] }}>
                        <Text variant="h4" style={{ marginBottom: space[4] }}>Daily Progress</Text>

                        {renderProgressBar("Calories (kcal)", summary.total_calories, summary.goals.daily_calories, "warning")}

                        <View style={{ flexDirection: "row", gap: space[3], marginTop: space[1] }}>
                            <View style={{ flex: 1 }}>
                                {renderProgressBar("Protein", summary.total_protein, summary.goals.daily_protein, "danger")}
                            </View>
                            <View style={{ flex: 1 }}>
                                {renderProgressBar("Carbs", summary.total_carbs, summary.goals.daily_carbs, "success")}
                            </View>
                            <View style={{ flex: 1 }}>
                                {renderProgressBar("Fats", summary.total_fats, summary.goals.daily_fats, "info")}
                            </View>
                        </View>
                    </Surface>

                    {/* TODAY'S LOG */}
                    <Text variant="h4" style={{ marginBottom: space[3] }}>Today's Logs</Text>
                    {summary?.logs && summary.logs.length === 0 ? (
                        <EmptyState
                            icon="restaurant-outline"
                            title="No food logged today yet"
                            body="Add a meal above to start tracking your macros."
                        />
                    ) : (
                        summary?.logs?.map((log) => (
                            <View
                                key={log.id}
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: space[3],
                                    paddingVertical: space[3],
                                    borderBottomWidth: 1,
                                    borderBottomColor: colors.border,
                                }}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text variant="h4">{log.item_name}</Text>
                                    <Text variant="bodySm" color="textMuted" style={{ marginTop: 2 }}>
                                        {log.meal_name} • {log.quantity || "1 serving"}
                                    </Text>
                                </View>
                                <View style={{ alignItems: "flex-end" }}>
                                    <Text variant="statSm" color="accentBright">{Math.round(log.calories)} kcal</Text>
                                    <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>
                                        P:{Math.round(log.protein)} C:{Math.round(log.carbs)} F:{Math.round(log.fats)}
                                    </Text>
                                </View>
                            </View>
                        ))
                    )}

                    {/* REFLECTION SECTION */}
                    <Text variant="h4" style={{ marginTop: space[6], marginBottom: space[3] }}>Daily Reflection</Text>

                    <Surface style={{ padding: space[4] }}>
                        <Text variant="label" color="accentBright" style={{ marginBottom: space[3] }}>
                            Diet Quality (1-10)
                        </Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space[2], marginBottom: space[5] }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                <Chip
                                    key={num}
                                    label={String(num)}
                                    selected={rating === num}
                                    onPress={() => setRating(num)}
                                />
                            ))}
                        </View>

                        <Input
                            label="Experience / Notes"
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="How did you feel? Bloated? Energetic?"
                            multiline
                            numberOfLines={3}
                            inputStyle={{ height: 90 }}
                            style={{ marginBottom: space[4] }}
                        />

                        <Button
                            title="Save Reflection"
                            loading={savingReflection}
                            onPress={handleSaveReflection}
                            fullWidth
                        />
                    </Surface>
                </>
            )}
        </Sheet>
    );
}
