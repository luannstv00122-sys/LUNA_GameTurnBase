using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.Events;
using System.Collections;

public class PlayButton : MonoBehaviour
{
    [Header("Scene")]
    [SerializeField] private string sceneName;

    [Header("Transition")]
    [SerializeField] private float delay = 0f;

    [Header("Events")]
    public UnityEvent onPlay;

    private bool isLoading = false;

    public void Play()
    {
        if (isLoading)
            return;

        isLoading = true;

        // Gọi Event khi nhấn Play
        onPlay?.Invoke();

        StartCoroutine(LoadScene());
    }

    private IEnumerator LoadScene()
    {
        if (delay > 0f)
            yield return new WaitForSeconds(delay);

        SceneManager.LoadScene(sceneName);
    }
}